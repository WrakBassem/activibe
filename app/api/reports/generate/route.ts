
import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-utils'
import sql from '@/lib/db'
import { generateDailyAnalysis, generateWeeklyAnalysis } from '@/lib/gemini'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'

// POST /api/reports/generate
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, date } = await request.json() // type: 'daily' | 'weekly'
    const targetDate = date ? new Date(date) : new Date()
    
    let reportMarkdown = ""

    if (type === 'daily') {
        // Fetch Daily Data
        const formattedDate = format(targetDate, 'yyyy-MM-dd')
        
        // 1. Get Score & entry
        const [dailyScore] = await sql`
            SELECT * FROM daily_scores WHERE user_id = ${userId} AND date = ${formattedDate}
        `
        
        if (!dailyScore) {
            return NextResponse.json({ error: 'No data found for this date. Please log first.' }, { status: 404 })
        }

        // 2. Get Details (Habits/Tasks)
        const items = await sql`
            SELECT 
                de.*, m.name, m.difficulty_level, m.max_points,
                CASE WHEN s.current_streak IS NULL THEN 0 ELSE s.current_streak END as streak
            FROM daily_entries de
            JOIN metrics m ON de.metric_id = m.id
            LEFT JOIN streaks s ON m.id = s.metric_id AND s.user_id = ${userId}
            WHERE de.user_id = ${userId} AND de.date = ${formattedDate}
        `

        // 3. Get 7-day history for trends
        const historyOnDate = await sql`
            SELECT date, total_score 
            FROM daily_scores 
            WHERE user_id = ${userId} 
            AND date < ${formattedDate} 
            AND date >= ${formattedDate}::date - INTERVAL '7 days'
            ORDER BY date ASC
        `

        // 4. Get sub-field values for today (grouped by metric)
        const fieldValuesRaw = await sql`
            SELECT 
                dfe.metric_id,
                m.name as metric_name,
                mf.name as field_name,
                mf.label as field_label,
                mf.field_type,
                dfe.value_int,
                dfe.value_bool,
                dfe.value_text
            FROM daily_field_entries dfe
            JOIN metric_fields mf ON dfe.field_id = mf.id
            JOIN metrics m ON dfe.metric_id = m.id
            WHERE dfe.user_id = ${userId} AND dfe.date = ${formattedDate}
            ORDER BY m.name, mf.sort_order
        `

        // Group field values by metric
        const fieldValuesByMetric: Record<string, any[]> = {}
        for (const fv of fieldValuesRaw) {
            if (!fieldValuesByMetric[fv.metric_name]) fieldValuesByMetric[fv.metric_name] = []
            fieldValuesByMetric[fv.metric_name].push({
                field: fv.field_label || fv.field_name,
                type: fv.field_type,
                value: fv.field_type === 'boolean' ? fv.value_bool
                    : fv.field_type === 'text' ? fv.value_text
                    : fv.value_int
            })
        }
        
        const dataPacket = {
            date: formattedDate,
            score: dailyScore,
            items: items.map(i => ({
                name: i.name,
                completed: i.completed,
                score_awarded: i.score_awarded,
                max: i.max_points,
                streak: i.streak
            })),
            history: historyOnDate,
            sub_metric_fields: fieldValuesByMetric,
        }

        reportMarkdown = await generateDailyAnalysis(dataPacket)
    } 
    else if (type === 'weekly') {
        // Fetch Weekly Data
        const start = format(startOfWeek(targetDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const end = format(endOfWeek(targetDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')

        // 1. Get Daily Scores
        const scores = await sql`
            SELECT date, total_score, mode 
            FROM daily_scores 
            WHERE user_id = ${userId} AND date BETWEEN ${start} AND ${end}
            ORDER BY date ASC
        `

        if (scores.length === 0) {
            return NextResponse.json({ error: 'No data found for this week.' }, { status: 404 })
        }

        // 2. Get Aggregated Metrics
        const metricStats = await sql`
            SELECT 
                m.name,
                COUNT(de.id) as total_days,
                SUM(CASE WHEN de.completed THEN 1 ELSE 0 END) as completed_days,
                SUM(de.score_awarded) as total_points
            FROM daily_entries de
            JOIN metrics m ON de.metric_id = m.id
            WHERE de.user_id = ${userId}
            AND de.date BETWEEN ${start} AND ${end}
            GROUP BY m.name
        `

        // 3. Get sub-field values for the week (averages/sums per field)
        const weeklyFieldsRaw = await sql`
            SELECT 
                m.name as metric_name,
                mf.name as field_name,
                mf.label as field_label,
                mf.field_type,
                COUNT(dfe.id) as days_logged,
                AVG(dfe.value_int) FILTER (WHERE mf.field_type IN ('int','scale_0_5')) as avg_value,
                SUM(dfe.value_int) FILTER (WHERE mf.field_type = 'int') as total_value,
                COUNT(*) FILTER (WHERE dfe.value_bool = true) as bool_true_days,
                COUNT(*) FILTER (WHERE dfe.value_bool = false) as bool_false_days,
                ARRAY_AGG(dfe.value_text) FILTER (WHERE dfe.value_text IS NOT NULL AND mf.field_type = 'text') as text_notes
            FROM daily_field_entries dfe
            JOIN metric_fields mf ON dfe.field_id = mf.id
            JOIN metrics m ON dfe.metric_id = m.id
            WHERE dfe.user_id = ${userId} AND dfe.date BETWEEN ${start} AND ${end}
            GROUP BY m.name, mf.name, mf.label, mf.field_type, mf.sort_order
            ORDER BY m.name, mf.sort_order
        `

        // Group by metric
        const weeklyFieldsByMetric: Record<string, any[]> = {}
        for (const f of weeklyFieldsRaw) {
            if (!weeklyFieldsByMetric[f.metric_name]) weeklyFieldsByMetric[f.metric_name] = []
            const entry: any = { field: f.field_label || f.field_name, type: f.field_type, days_logged: f.days_logged }
            if (f.field_type === 'int') { entry.total = f.total_value; entry.avg = f.avg_value ? Math.round(f.avg_value) : null }
            if (f.field_type === 'scale_0_5') { entry.avg = f.avg_value ? Number(f.avg_value).toFixed(1) : null }
            if (f.field_type === 'boolean') { entry.done_days = f.bool_true_days; entry.skipped_days = f.bool_false_days }
            if (f.field_type === 'text') { entry.notes = f.text_notes }
            weeklyFieldsByMetric[f.metric_name].push(entry)
        }

        const dataPacket = {
            week_range: `${start} to ${end}`,
            daily_scores: scores,
            metric_performance: metricStats,
            sub_metric_fields_weekly: weeklyFieldsByMetric,
        }

        reportMarkdown = await generateWeeklyAnalysis(dataPacket)
    }

    return NextResponse.json({
      success: true,
      report: reportMarkdown
    })

  } catch (error: any) {
    console.error('[POST /api/reports/generate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report', details: error.message },
      { status: 500 }
    )
  }
}

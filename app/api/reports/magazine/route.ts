import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { generateWeeklyMagazine } from '@/lib/gemini'
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns'

// GET /api/reports/magazine - Fetch (or generate) the Weekly Magazine
export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // We can allow passing a specific date, but default to "last completed week"
    // For our purposes, let's say "this current week so far" or "last 7 days".
    // Let's use the last 7 days from today to keep it always relevant.
    const targetDate = new Date()
    const endDateStr = format(targetDate, 'yyyy-MM-dd')
    const startDateStr = format(subDays(targetDate, 6), 'yyyy-MM-dd')

    // 1. Check Cache
    // We'll cache by week_start (which in our rolling 7-day model, we'll just check if a report exists generated *today*)
    // Alternatively, we can let them generate a fresh one if they explicitly request it, 
    // but for now, let's cache per day so they can read it multiple times without repinging AI.
    const cached = await sql`
        SELECT magazine_data, created_at
        FROM weekly_magazines
        WHERE user_id = ${userId}
        AND created_at >= CURRENT_DATE
        ORDER BY created_at DESC
        LIMIT 1
    `

    if (cached.length > 0) {
        return NextResponse.json({
            success: true,
            cached: true,
            data: cached[0].magazine_data,
            date_range: `${startDateStr} to ${endDateStr}`
        })
    }

    // 2. No Cache found for today, Gather Data for AI
    // We'll borrow the aggregation logic from generate/route.ts
    const scores = await sql`
        SELECT date, total_score, mode, burnout_flag, procrastination_flag
        FROM daily_scores 
        WHERE user_id = ${userId} AND date BETWEEN ${startDateStr} AND ${endDateStr}
        ORDER BY date ASC
    `

    if (scores.length === 0) {
        return NextResponse.json({ success: false, message: 'Not enough data logged this week to generate a magazine.' }, { status: 404 })
    }

    const metricStats = await sql`
        SELECT 
            m.name, m.rpg_attribute,
            COUNT(de.id) as total_days,
            SUM(CASE WHEN de.completed THEN 1 ELSE 0 END) as completed_days,
            SUM(de.score_awarded) as total_points,
            ROUND(AVG(de.score_value) FILTER (WHERE de.score_value IS NOT NULL), 1) as avg_score_value,
            ARRAY_AGG(de.review) FILTER (WHERE de.review IS NOT NULL AND de.review != '') as reviews
        FROM daily_entries de
        JOIN metrics m ON de.metric_id = m.id
        WHERE de.user_id = ${userId}
        AND de.date BETWEEN ${startDateStr} AND ${endDateStr}
        GROUP BY m.name, m.rpg_attribute
    `

    const dataPacket = {
        week_range: `${startDateStr} to ${endDateStr}`,
        daily_scores: scores,
        metric_performance: metricStats,
    }

    // 3. Generate Magazine via AI
    const magazineData = await generateWeeklyMagazine(dataPacket)

    if (!magazineData) {
        throw new Error("AI failed to generate a valid magazine structure.")
    }

    // 4. Save to Cache
    await sql`
        INSERT INTO weekly_magazines (user_id, week_start, week_end, magazine_data)
        VALUES (${userId}, ${startDateStr}, ${endDateStr}, ${sql.json(magazineData as any)})
        ON CONFLICT (user_id, week_start) DO UPDATE SET
            magazine_data = EXCLUDED.magazine_data,
            created_at = CURRENT_TIMESTAMP
    `

    return NextResponse.json({
      success: true,
      cached: false,
      data: magazineData,
      date_range: `${startDateStr} to ${endDateStr}`
    })

  } catch (error: any) {
    console.error('[GET /api/reports/magazine] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch magazine', details: error.message },
      { status: 500 }
    )
  }
}

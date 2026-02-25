import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { generateMorningBriefing } from '@/lib/gemini'

// GET /api/reports/morning
// Returns today's morning briefing from DB cache if it exists.
// If not yet generated for today, triggers generation + save, then returns it.
// Client never waits for AI — it polls this endpoint silently.
export async function GET() {
    try {
        const userId = await getAuthUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' }) // YYYY-MM-DD

        // 1. Check if today's morning report is already cached in ai_insights
        const cached = await sql`
            SELECT raw_text, created_at
            FROM ai_insights
            WHERE user_id = ${userId}
              AND report_type = 'morning'
              AND report_date = ${todayStr}
            LIMIT 1
        `

        if (cached.length > 0 && cached[0].raw_text) {
            try {
                const parsed = JSON.parse(cached[0].raw_text)
                return NextResponse.json({ success: true, data: parsed, cached: true })
            } catch {
                // raw_text is malformed — fall through and regenerate
            }
        }

        // 2. Not cached — generate fresh briefing

        // Fetch Yesterday's Log
        const yesterdayLog = await sql`
            SELECT total_score, mode, date
            FROM daily_scores
            WHERE user_id = ${userId}
            ORDER BY date DESC
            LIMIT 1
        `

        // Fetch Active Quests
        const quests = await sql`
            SELECT title, description, xp_reward, metric_id
            FROM quests
            WHERE user_id = ${userId} AND status = 'active'
        `

        // Fetch Lowest Performing Metrics — scoped to this user
        const lowMetrics = await sql`
            SELECT 
                a.name as axis_name,
                m.name as metric_name,
                COUNT(de.id) as completion_days
            FROM axes a
            JOIN metrics m ON a.id = m.axis_id
            LEFT JOIN daily_entries de ON m.id = de.metric_id 
                AND de.completed = true 
                AND de.date >= CURRENT_DATE - INTERVAL '7 days'
                AND de.user_id = ${userId}
            WHERE m.active = true
              AND m.user_id = ${userId}
              AND a.user_id = ${userId}
            GROUP BY a.name, m.name
            ORDER BY completion_days ASC
            LIMIT 5
        `

        const payload = {
            yesterdays_performance: yesterdayLog.length > 0 ? yesterdayLog[0] : null,
            active_quests: quests,
            lowest_performing_metrics_last_7_days: lowMetrics
        }

        const briefing = await generateMorningBriefing(payload)

        if (!briefing) {
            return NextResponse.json({ error: 'AI Oracle unavailable.' }, { status: 500 })
        }

        // 3. Save to ai_insights so future requests are instant
        const briefingJson = JSON.stringify(briefing)
        await sql`
            INSERT INTO ai_insights (user_id, report_type, report_date, tips, strategies, focus_areas, raw_text)
            VALUES (
                ${userId}, 'morning', ${todayStr},
                '[]'::jsonb,
                '[]'::jsonb,
                '[]'::jsonb,
                ${briefingJson}
            )
            ON CONFLICT (user_id, report_type, report_date)
            DO UPDATE SET
                raw_text = EXCLUDED.raw_text,
                created_at = NOW()
        `

        return NextResponse.json({ success: true, data: briefing, cached: false })

    } catch (error: any) {
        console.error('[GET /api/reports/morning] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

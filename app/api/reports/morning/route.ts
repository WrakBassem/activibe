import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { generateMorningBriefing } from '@/lib/gemini'

export async function GET(request: Request) {
    try {
        const userId = await getAuthUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch Yesterday's Log
        const yesterdayLog = await sql`
            SELECT total_score, mode, date
            FROM daily_scores
            WHERE user_id = ${userId}
            ORDER BY date DESC
            LIMIT 1
        `;

        // 2. Fetch Active Quests
        const quests = await sql`
            SELECT title, description, xp_reward, metric_id
            FROM quests
            WHERE user_id = ${userId} AND status = 'active'
        `;

        // 3. Fetch Lowest Performing Axis/Metrics (Quick 7-day look back)
        const lowMetrics = await sql`
            SELECT 
                a.name as axis_name,
                m.name as metric_name,
                COUNT(de.id) as completion_days
            FROM axes a
            JOIN metrics m ON a.id = m.axis_id
            LEFT JOIN daily_entries de ON m.id = de.metric_id AND de.completed = true AND de.date >= CURRENT_DATE - INTERVAL '7 days'
            WHERE m.active = true
            GROUP BY a.name, m.name
            ORDER BY completion_days ASC
            LIMIT 5
        `;

        // Assemble Data Payload for AI
        const payload = {
            yesterdays_performance: yesterdayLog.length > 0 ? yesterdayLog[0] : null,
            active_quests: quests,
            lowest_performing_metrics_last_7_days: lowMetrics
        };

        // 4. Generate AI Briefing
        const briefing = await generateMorningBriefing(payload);

        if (!briefing) {
            return NextResponse.json({ error: 'Failed to generate briefing from AI Oracle.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: briefing
        });

    } catch (error: any) {
        console.error('[GET /api/reports/morning] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch morning briefing', details: error.message }, { status: 500 });
    }
}

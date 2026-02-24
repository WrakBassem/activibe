import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch active quests
    const activeQuests = await sql`
        SELECT q.*, m.name as metric_name, m.icon as metric_icon
        FROM quests q
        LEFT JOIN metrics m ON q.metric_id = m.id
        WHERE q.user_id = ${userId} AND q.status = 'active'
        ORDER BY q.created_at DESC
    `

    // Let's also fetch recently completed quests for a "bounty cleared" feeling (last 3 days)
    const completedQuests = await sql`
        SELECT q.*, m.name as metric_name, m.icon as metric_icon
        FROM quests q
        LEFT JOIN metrics m ON q.metric_id = m.id
        WHERE q.user_id = ${userId} AND q.status = 'completed'
        ORDER BY q.created_at DESC
        LIMIT 3
    `

    return NextResponse.json({
      success: true,
      data: {
          active: activeQuests,
          recent_completed: completedQuests
      }
    })

  } catch (error: any) {
    console.error('[GET /api/quests] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Generate a New Quest dynamically based on underperforming metrics
export async function POST(request: Request) {
    try {
        const userId = await getAuthUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Check if user already has 3 active quests (Max allowed)
        const activeCount = await sql`
            SELECT count(*) as count FROM quests WHERE user_id = ${userId} AND status = 'active'
        `;
        if (activeCount[0].count >= 3) {
            return NextResponse.json({ success: false, message: 'Quest log is full. Complete active quests first.' }, { status: 400 })
        }

        // 2. Intelligence: Find the lowest performing active metric over the last 14 days
        const lowestMetrics = await sql`
            SELECT m.id, m.name, 
                   COALESCE(SUM(de.score_awarded), 0) as total_recent_score
            FROM metrics m
            LEFT JOIN daily_entries de ON m.id = de.metric_id 
                  AND de.user_id = ${userId} 
                  AND de.date >= CURRENT_DATE - INTERVAL '14 days'
            WHERE m.active = TRUE
            GROUP BY m.id, m.name
            ORDER BY total_recent_score ASC
            LIMIT 1
        `;

        if (!lowestMetrics || lowestMetrics.length === 0) {
             return NextResponse.json({ error: 'No actionable metrics found to generate a quest.' }, { status: 400 })
        }

        const targetMetric = lowestMetrics[0];
        
        // 3. Generate Quest Details
        // Randomize the target slightly (e.g., do it 2 to 4 times) for variety.
        const targetValue = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
        const xpReward = targetValue * 150 + 100; // Base 100 + 150 per completion
        
        // Expiration: 1 day per target value + 1 buffer day
        const daysToComplete = targetValue + 1;

        const title = `The ${targetMetric.name} Recovery Protocol`;
        const description = `The AI has detected a drop in your ${targetMetric.name} consistency. Restore balance by completing this habit ${targetValue} times before the deadline.`;

        // 4. Insert into database
        const newQuest = await sql`
            INSERT INTO quests (user_id, title, description, metric_id, target_value, current_value, xp_reward, expires_at)
            VALUES (
                ${userId}, 
                ${title}, 
                ${description}, 
                ${targetMetric.id}, 
                ${targetValue}, 
                0, 
                ${xpReward}, 
                CURRENT_TIMESTAMP + (${daysToComplete} || ' days')::INTERVAL
            )
            RETURNING *
        `;

        return NextResponse.json({
            success: true,
            message: 'New quest generated.',
            data: newQuest[0]
        }, { status: 201 });

    } catch (error: any) {
        console.error('[POST /api/quests] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const userId = await getAuthUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id } = body

        if (!id) {
            return NextResponse.json({ error: 'Missing quest ID' }, { status: 400 })
        }

        if (id === 'all') {
            await sql`DELETE FROM quests WHERE user_id = ${userId} AND status = 'active'`
        } else {
            await sql`DELETE FROM quests WHERE user_id = ${userId} AND id = ${id}`
        }

        return NextResponse.json({ success: true, message: 'Quest(s) abandoned.' })
    } catch (error: any) {
        console.error('[DELETE /api/quests] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

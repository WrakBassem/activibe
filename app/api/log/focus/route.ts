import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { awardXP } from '@/lib/gamification'
import { format } from 'date-fns'

export async function POST(request: Request) {
    try {
        const userId = await getAuthUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { minutes_focused, metric_id } = body;
        const date = format(new Date(), 'yyyy-MM-dd');

        if (!minutes_focused || typeof minutes_focused !== 'number') {
            return NextResponse.json({ error: 'Valid minutes_focused is required' }, { status: 400 });
        }

        let totalXpAwarded = 0;
        let messages: string[] = [];

        // 1. Award Base Global XP (e.g., 2 XP per minute of focus)
        const baseXP = minutes_focused * 2;
        await awardXP(userId, `focus_session:${Date.now()}`, baseXP);
        totalXpAwarded += baseXP;
        messages.push(`Earned ${baseXP} Global XP for Focus Session.`);

        if (metric_id) {
            // Find metric details
            const metrics = await sql`SELECT id, name, rpg_attribute FROM metrics WHERE id = ${metric_id} AND user_id = ${userId}`;
            if (metrics.length > 0) {
                const metric = metrics[0];
                const attributeName = metric.rpg_attribute || 'intellect';

                // 2. Mark Habit as completed and add time_spent
                await sql`
                    INSERT INTO daily_entries (user_id, metric_id, date, completed, time_spent_minutes)
                    VALUES (${userId}, ${metric_id}, ${date}, true, ${minutes_focused})
                    ON CONFLICT (user_id, metric_id, date)
                    DO UPDATE SET 
                        completed = true, 
                        time_spent_minutes = COALESCE(daily_entries.time_spent_minutes, 0) + ${minutes_focused}
                `;

                // 3. Award Attribute-Specific XP (e.g., 10 XP per minute)
                const attrXP = minutes_focused * 10;
                await sql`
                    INSERT INTO user_attributes (user_id, attribute_name, total_xp, level)
                    VALUES (${userId}, ${attributeName}, ${attrXP}, 1)
                    ON CONFLICT (user_id, attribute_name)
                    DO UPDATE SET 
                        total_xp = user_attributes.total_xp + EXCLUDED.total_xp,
                        last_updated = CURRENT_TIMESTAMP
                `;
                // Update level
                await sql`
                    UPDATE user_attributes
                    SET level = GREATEST(1, FLOOR(SQRT(total_xp) / 10) + 1)
                    WHERE user_id = ${userId} AND attribute_name = ${attributeName}
                `;
                totalXpAwarded += attrXP;
                messages.push(`Earned ${attrXP} XP to ${attributeName.toUpperCase()}.`);

                // 4. Advance Quests
                const activeQuests = await sql`
                    SELECT id, target_value, current_value, xp_reward 
                    FROM quests 
                    WHERE user_id = ${userId} AND status = 'active' AND metric_id = ${metric_id}
                `;

                for (const quest of activeQuests) {
                    const newValue = quest.current_value + 1; // Treating 1 focus session as 1 completion tick
                    const isCompleted = newValue >= quest.target_value;
                    const newStatus = isCompleted ? 'completed' : 'active';

                    await sql`
                        UPDATE quests 
                        SET current_value = ${newValue}, status = ${newStatus}
                        WHERE id = ${quest.id}
                    `;

                    if (isCompleted) {
                        await awardXP(userId, `quest_completed:${quest.id}`, quest.xp_reward);
                        totalXpAwarded += quest.xp_reward;
                        messages.push(`Quest Completed! Bonus ${quest.xp_reward} XP.`);
                    } else {
                        messages.push(`Quest Progressed (${newValue}/${quest.target_value}).`);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                total_xp_awarded: totalXpAwarded,
                messages: messages
            }
        });

    } catch (error: any) {
        console.error('[POST /api/log/focus] Error:', error);
        return NextResponse.json({ error: 'Failed to log focus session', details: error.message }, { status: 500 });
    }
}

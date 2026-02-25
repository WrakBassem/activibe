import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { awardXP, awardGold } from '@/lib/gamification'
import { format } from 'date-fns'
import { getActiveBoss, dealBossDamage } from '@/lib/bosses'

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

        // Fetch Hardcore status
        const userStatus = await sql`SELECT hardcore_mode_active FROM users WHERE id = ${userId}`;
        const isHardcore = userStatus[0]?.hardcore_mode_active || false;

        let totalXpAwarded = 0;
        let messages: string[] = [];

        // 1. Award Base Global XP (e.g., 2 XP per minute of focus)
        const baseXP = minutes_focused * 2;
        await awardXP(userId, `focus_session:${Date.now()}`, baseXP);
        totalXpAwarded += baseXP;
        messages.push(`Earned ${baseXP} Global XP for Focus Session.`);
        
        // Award Gold (1 Gold per minute focused)
        await awardGold(userId, minutes_focused);
        messages.push(`Found ${minutes_focused} Gold 🪙.`);

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
                let attrXP = minutes_focused * 10;
                if (isHardcore) attrXP *= 2;

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

        // 5. Boss Damage Logic
        let bossFeedback = null;
        try {
            // Check for Focus Gauntlets
            const gauntletsPassives = await sql`
                SELECT up.stacks
                FROM user_passives up
                JOIN items i ON up.item_id = i.id
                WHERE i.name = 'Focus Gauntlets' AND up.user_id = ${userId}
            `;
            let activeMultiplier = 1;
            if (gauntletsPassives.length > 0) {
                // 1 stack = 1.5x, 2 stacks = 2.0x
                activeMultiplier = 1 + (gauntletsPassives[0].stacks * 0.5);
            }

            // Every minute focused deals 1 DMG * multiplier
            const damage = Math.round(minutes_focused * activeMultiplier);
            const result = await dealBossDamage(userId, damage);
            
            if (result.defeated) {
                bossFeedback = { type: 'defeat', ...result.reward };
            } else {
                const active = await getActiveBoss(userId);
                if (active) {
                    bossFeedback = { type: 'damage', damage, current_health: active.current_health, boss_name: active.name };
                }
            }
        } catch (bossErr) {
            console.warn('[POST /api/log/focus] Boss damage failed:', bossErr);
        }

        return NextResponse.json({
            success: true,
            data: {
                total_xp_awarded: totalXpAwarded,
                messages: messages,
                boss: bossFeedback
            }
        });

    } catch (error: any) {
        console.error('[POST /api/log/focus] Error:', error);
        return NextResponse.json({ error: 'Failed to log focus session', details: error.message }, { status: 500 });
    }
}

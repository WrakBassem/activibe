import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { format } from 'date-fns'
import { awardXP, deductXP, XP_PER_LOG, XP_PER_PERFECT_SCORE, awardGold } from '@/lib/gamification'
import { checkAndUnlockAchievements } from '@/lib/achievements'
import { getActiveBoss, dealBossDamage, checkBossSpawn, processDailyBossPenalty } from '@/lib/bosses'
import { getCampaignStatus, dealCampaignDamage } from '@/lib/campaign'

export const dynamic = 'force-dynamic';

// Helper to get today's date in YYYY-MM-DD
const getToday = () => format(new Date(), 'yyyy-MM-dd')

// GET /api/daily - Fetch daily log for a specific date (or today)
export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || getToday()

    // 1. Fetch Summary
    const summary = await sql`
        SELECT * FROM daily_scores 
        WHERE user_id = ${userId} AND date = ${date}
    `

    // 2. Fetch Entries
    const entries = await sql`
        SELECT * FROM daily_entries
        WHERE user_id = ${userId} AND date = ${date}
    `

    // 3. Fetch Field Values
    const fieldValues = await sql`
        SELECT dfe.*, mf.name, mf.label, mf.field_type
        FROM daily_field_entries dfe
        JOIN metric_fields mf ON dfe.field_id = mf.id
        WHERE dfe.user_id = ${userId} AND dfe.date = ${date}
    `

    // 4. Boss Info & Penalty Processing
    // Only process penalty if fetching for TODAY (or later) to avoid re-triggering on old logs
    let activeBoss = null
    const todayStr = getToday()
    
    if (date >= todayStr) {
        // This fires the once-per-day penalty check
        await processDailyBossPenalty(userId)
    }
    
    // 5. Campaign Status
    const campaignStatus = await getCampaignStatus(userId)

    return NextResponse.json({
      success: true,
      data: {
          summary: summary[0] || null,
          entries: entries,
          field_values: fieldValues,
          active_boss: activeBoss,
          campaign_status: campaignStatus
      }
    })
  } catch (error: any) {
    console.error('[GET /api/daily] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily log', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/daily - Submit Daily Log (performs weighted scoring)
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const logDate = body.date || getToday()
    const { metric_inputs, field_values } = body
    
    let bossFeedback: any = null
    console.log(`[POST /api/daily] Received ${metric_inputs?.length} inputs for ${logDate}`);
    if (metric_inputs?.length > 0) {
        console.log('Sample input:', JSON.stringify(metric_inputs[0]));
        // Log specifically for the stretch metric if possible (or just all IDs)
        console.log('Input IDs:', metric_inputs.map((m: any) => m.metric_id));
    }
    
    if (!metric_inputs || !Array.isArray(metric_inputs)) {
         return NextResponse.json({ error: 'metric_inputs array is required' }, { status: 400 })
    }

    // --- SCORING ENGINE ---
    // Check for Retroactive Submission (Time Turner)
    const todayStr = getToday();
    if (logDate < todayStr) {
        const pastBuffs = await sql`
            SELECT ab.id as buff_id
            FROM active_buffs ab
            JOIN items i ON ab.item_id = i.id
            WHERE ab.user_id = ${userId} AND i.effect_type = 'edit_past_log' AND ab.expires_at > CURRENT_TIMESTAMP
            LIMIT 1
        `;

        if (pastBuffs.length === 0) {
            return NextResponse.json({ error: 'You cannot submit logs for past dates without an active Time Turner buff.' }, { status: 403 });
        }

        // Consume the buff (delete it)
        await sql`DELETE FROM active_buffs WHERE id = ${pastBuffs[0].buff_id}`;
    }

    // 1. Fetch Active Cycle & Weights for this user
    // Find cycle that covers logDate
    const cycles = await sql`
        SELECT id FROM priority_cycles
        WHERE start_date <= ${logDate} AND end_date >= ${logDate}
        AND user_id = ${userId}
        LIMIT 1
    `
    
    let activeWeights: any[] = [];
    if (cycles.length > 0) {
        activeWeights = await sql`
            SELECT axis_id, weight_percentage 
            FROM axis_weights 
            WHERE cycle_id = ${cycles[0].id}
        `
    } else {
         // Fallback: If no active cycle, give all active axes equal weight
         const activeAxesUser = await sql`SELECT id FROM axes WHERE active = TRUE AND user_id = ${userId}`;
         const equalWeight = activeAxesUser.length > 0 ? 100 / activeAxesUser.length : 0;
         activeWeights = activeAxesUser.map(a => ({ axis_id: a.id, weight_percentage: equalWeight }));
    }

    // 2. Fetch All Active Metrics scoped to this user
    const metrics = await sql`
        SELECT id, axis_id, max_points, input_type 
        FROM metrics 
        WHERE active = TRUE AND user_id = ${userId}
    `
    const metricsMap = new Map(metrics.map(m => [m.id, m]));

    // 3. Calculate Scores per Axis
    const axisScores: Record<string, { raw: number, max: number, weight: number }> = {};
    
    // Initialize axis aggregators for this user's axes
    const allAxes = await sql`SELECT id FROM axes WHERE active = TRUE AND user_id = ${userId}`;
    for (const axis of allAxes) {
        const w = activeWeights.find(aw => aw.axis_id === axis.id)?.weight_percentage || 0;
        axisScores[axis.id] = { raw: 0, max: 0, weight: w };
    }

    // Calculate Max Possible Points per Axis
    for (const m of metrics) {
        if (axisScores[m.axis_id]) {
            axisScores[m.axis_id].max += m.max_points;
        }
    }

    // Calculate Raw Points Achieved
    const processedEntries: Array<{ metric_id: string; completed: boolean; score_awarded: number; time_spent: number | null; review: string | null; score_value: number | null }> = [];
    for (const input of metric_inputs) {
        const metric = metricsMap.get(input.metric_id);
        if (!metric) continue; // Skip unknown/inactive metrics

        // Calculate score based on input_type
        const inputType = metric.input_type || 'boolean';
        let scoreAwarded = 0;
        let completed = false;
        const scoreValue = input.score_value ?? null;

        if (inputType === 'boolean') {
            completed = input.completed;
            scoreAwarded = completed ? metric.max_points : 0;
        } else if (inputType === 'emoji_5' || inputType === 'scale_0_5') {
            // Proportional: (value / 5) * max_points
            const val = Math.min(Math.max(Number(scoreValue) || 0, 0), 5);
            scoreAwarded = Math.round((val / 5) * metric.max_points);
            completed = val > 0;
        } else if (inputType === 'scale_0_10') {
            // Proportional: (value / 10) * max_points
            const val = Math.min(Math.max(Number(scoreValue) || 0, 0), 10);
            scoreAwarded = Math.round((val / 10) * metric.max_points);
            completed = val > 0;
        }
        
        if (axisScores[metric.axis_id]) {
            axisScores[metric.axis_id].raw += scoreAwarded;
        }

        processedEntries.push({
            metric_id: input.metric_id,
            completed,
            score_awarded: scoreAwarded,
            time_spent: input.time_spent_minutes || null,
            review: input.review || null,
            score_value: scoreValue,
        });
    }

    // 4. Compute Final Weighted Score & Time Spent
    // Formula: Sum of ( (AxisRaw / AxisMax) * AxisWeight )
    let finalScore = 0;
    let totalTimeSpent = 0;

    for (const axisId in axisScores) {
        const { raw, max, weight } = axisScores[axisId];
        if (max > 0 && weight > 0) {
            const axisRatio = raw / max;
            finalScore += axisRatio * weight;
        }
    }
    
    // Round to nearest integer
    finalScore = Math.round(finalScore);

    // Calculate total time from inputs
    for (const input of metric_inputs) {
        if (input.time_spent_minutes) totalTimeSpent += input.time_spent_minutes;
    }

    // --- INTELLIGENCE LAYER ---
    // 4b. Detect Burnout & Procrastination flags
    let burnoutFlag = false;
    let procrastinationFlag = false;

    // Fetch last 3 days of scores to detect patterns
    const recentHistory = await sql`
        SELECT total_score, burnout_flag
        FROM daily_scores
        WHERE user_id = ${userId} AND date < ${logDate}
        ORDER BY date DESC
        LIMIT 3
    `;

    // Burnout Logic:
    // Defined as: High Effort (Time > 480m/8h) BUT Low Results (Score < 50) OR Consecutive Burnout
    // If today is heavy work but low score, it's a risk. 
    // If user was already burned out yesterday, it's sticky.
    if ((totalTimeSpent > 480 && finalScore < 50) || 
        (recentHistory.some(h => h.burnout_flag) && finalScore < 60)) {
        burnoutFlag = true;
    }

    // Procrastination Logic:
    // Defined as: Low Effort (Time < 30m) AND Low Score (< 40)
    if (totalTimeSpent < 30 && finalScore < 40) {
        procrastinationFlag = true;
    }


    // --- DATABASE UPDATES ---
    
    // 5. Upsert Daily Summary
    // We determine "mode" roughly based on score for now (can be more complex later)
    let mode = 'Stable';
    if (finalScore > 85) mode = 'Growth';
    else if (finalScore < 60) mode = 'Recovery';
    
    // Overwrite mode if flags are set
    if (burnoutFlag) mode = 'Burnout Risk';
    else if (procrastinationFlag) mode = 'Slump';

    const summaryStart = await sql`
        INSERT INTO daily_scores (date, total_score, mode, burnout_flag, procrastination_flag, user_id)
        VALUES (${logDate}, ${finalScore}, ${mode}, ${burnoutFlag}, ${procrastinationFlag}, ${userId})
        ON CONFLICT (date, user_id)
        DO UPDATE SET
            total_score = EXCLUDED.total_score,
            mode = EXCLUDED.mode,
            burnout_flag = EXCLUDED.burnout_flag,
            procrastination_flag = EXCLUDED.procrastination_flag
        RETURNING *
    `;

    // 6. Upsert Daily Entries
    // We delete old entries for this date/user and re-insert to handle un-checks easily?
    // Or upsert one by one. Re-inserting is safer for "removing" separate items if the list changes?
    // Actually, upsert is fine if we cover all metrics. But if a user unchecks something, we expect "completed=false" sent.
    
    // 6. Transaction: Refresh Daily Entries & Update Streaks
    // Fetch existing streaks for this user (Needed for streak calculation inside tx)
    const existingStreaks = await sql`
        SELECT * FROM streaks WHERE user_id = ${userId}
    `
    const streakMap = new Map(existingStreaks.map(s => [s.metric_id, s]))

    await sql.begin(async (tx) => {
        // A. Clear existing entries for this day
        await (tx as any)`
            DELETE FROM daily_entries 
            WHERE user_id = ${userId} AND date = ${logDate}
        `

        // B. Batched Insert of New Entries
        if (processedEntries.length > 0) {
            const rows = processedEntries.map((e: any) => ({
                date: logDate,
                metric_id: e.metric_id,
                completed: e.completed,
                score_awarded: e.score_awarded,
                time_spent_minutes: e.time_spent, 
                user_id: userId,
                review: e.review,
                score_value: e.score_value,
            }));

            // Force type casting to avoid "not callable" TS error with postgres.js transaction
            await (tx as any)`
                INSERT INTO daily_entries ${sql(rows, 'date', 'metric_id', 'completed', 'score_awarded', 'time_spent_minutes', 'user_id', 'review', 'score_value')}
            `
        }

        // C. Update Streaks
        for (const entry of processedEntries) {
            if (entry.completed) {
                const currentStreakData = streakMap.get(entry.metric_id)
                let newStreak = 1
                let newLongest = 1
                
                if (currentStreakData) {
                    const lastDate = new Date(currentStreakData.last_log_date)
                    const thisDate = new Date(logDate)
                    const diffTime = Math.abs(thisDate.getTime() - lastDate.getTime())
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 

                    if (thisDate.getTime() === lastDate.getTime()) {
                       newStreak = currentStreakData.current_streak
                       newLongest = currentStreakData.longest_streak
                    } else if (diffDays === 1) {
                       newStreak = currentStreakData.current_streak + 1
                       newLongest = Math.max(currentStreakData.longest_streak, newStreak)
                    } else if (thisDate > lastDate) {
                       newStreak = 1
                       newLongest = currentStreakData.longest_streak 
                    } else {
                       continue; 
                    }
                }
                
                await (tx as any)`
                    INSERT INTO streaks (metric_id, user_id, current_streak, longest_streak, last_log_date)
                    VALUES (${entry.metric_id}, ${userId}, ${newStreak}, ${newLongest}, ${logDate})
                    ON CONFLICT (metric_id, user_id)
                    DO UPDATE SET
                        current_streak = EXCLUDED.current_streak,
                        longest_streak = EXCLUDED.longest_streak,
                        last_log_date = EXCLUDED.last_log_date
                `
            }
        }
    })

    // 7. Save Field Values (sub-metrics)
    if (field_values && Array.isArray(field_values) && field_values.length > 0) {
      for (const fv of field_values) {
        if (!fv.field_id || !fv.metric_id) continue
        await sql`
          INSERT INTO daily_field_entries (user_id, metric_id, field_id, date, value_int, value_bool, value_text, review)
          VALUES (${userId}, ${fv.metric_id}, ${fv.field_id}, ${logDate}, ${fv.value_int ?? null}, ${fv.value_bool ?? null}, ${fv.value_text ?? null}, ${fv.review ?? null})
          ON CONFLICT (user_id, field_id, date)
          DO UPDATE SET
            value_int = EXCLUDED.value_int,
            value_bool = EXCLUDED.value_bool,
            value_text = EXCLUDED.value_text,
            review = EXCLUDED.review
        `
      }
    }

    // 8. Award Base XP and Attribute XP (only on FIRST submission for this date)
    let xpResult = null
    let questXpResult = null
    let lootDrop = null // Variable to store awarded item
    let campaignFeedback: any = null

    try {
      const existingXP = await sql`
        SELECT id FROM user_xp_log 
        WHERE user_id = ${userId} 
          AND reason LIKE ${'daily_log:' + logDate + '%'}
        LIMIT 1
      `
      
      // --- HARDCORE MODE CHECK ---
      const userStatus = await sql`SELECT hardcore_mode_active FROM users WHERE id = ${userId}`
      const isHardcore = userStatus[0]?.hardcore_mode_active || false

      // Penalty check (< 40 score)
      let effectiveHardcore = isHardcore
      if (isHardcore && finalScore < 40) {
          await sql`UPDATE users SET hardcore_mode_active = FALSE WHERE id = ${userId}`
          await deductXP(userId, `hardcore_death:${logDate}:low_score`, 500)
          effectiveHardcore = false // Disable multipliers for this log's processing
      }

      // --- BOSS LOGIC ---
      try {
          // 1. Check for damage
          if (finalScore >= 80) {
              const damage = finalScore === 100 ? 100 : 50
              const result = await dealBossDamage(userId, damage)
              if (result.defeated) {
                  bossFeedback = { type: 'defeat', ...result.reward }
              } else {
                  // If we didn't defeat it, just get info to show remaining health
                  const active = await getActiveBoss(userId)
                  if (active) {
                      bossFeedback = { type: 'damage', damage, current_health: active.current_health, boss_name: active.name }
                  }
              }
          }

          // 2. Check for spawn if no boss is active
          if (!bossFeedback) {
              const spawned = await checkBossSpawn(userId)
              if (spawned) {
                  bossFeedback = { type: 'spawn', boss_name: spawned.name, current_health: spawned.current_health }
              }
          }
      } catch (bossErr) {
          console.warn('[POST /api/daily] Boss logic failed:', bossErr)
      }

      // --- CAMPAIGN LOGIC ---
      try {
          if (finalScore > 0) {
              const result = await dealCampaignDamage(userId, finalScore)
              campaignFeedback = {
                  damage: finalScore,
                  defeated: result.defeated,
                  reward: result.reward,
                  remaining_health: result.remaining_health
              }
          }
      } catch (campErr) {
          console.warn('[POST /api/daily] Campaign logic failed:', campErr)
      }

      if (existingXP.length === 0) {
        let xpToAward = XP_PER_LOG
        let xpReason = `daily_log:${logDate}`
        
        if (finalScore === 100) {
          xpToAward += XP_PER_PERFECT_SCORE
          xpReason = `daily_log:${logDate}:perfect`
          
          // --- LOOT DROP LOGIC ---
          const itemsResult = await sql`SELECT * FROM items`
          if (itemsResult.length > 0) {
              // Simple RNG: Random item from the registry
              const randomIndex = Math.floor(Math.random() * itemsResult.length)
              const wonItem = itemsResult[randomIndex]
              
              await sql`
                  INSERT INTO user_inventory (user_id, item_id, quantity)
                  VALUES (${userId}, ${wonItem.id}, 1)
                  ON CONFLICT (user_id, item_id)
                  DO UPDATE SET quantity = user_inventory.quantity + 1, last_acquired_at = CURRENT_TIMESTAMP
              `
              
              lootDrop = wonItem
          }
        }
        
        xpResult = await awardXP(userId, xpReason, xpToAward)

        // Award Base Gold (50 for log, +50 for perfect)
        let goldToAward = 50
        if (finalScore === 100) goldToAward += 50
        await awardGold(userId, goldToAward)

        // 8b. Award Attribute Specific XP
        const completedMetrics = processedEntries.filter(e => e.completed)
        if (completedMetrics.length > 0) {
            // First, find the RPG attribute for each completed metric
            const metricDetails = await sql`
                SELECT id, rpg_attribute FROM metrics
                WHERE id = ANY(${sql.array(completedMetrics.map(e => e.metric_id))}::uuid[])
            `
            
            // Map the metric ID to the attribute
            const attributeMap: Record<string, string> = {}
            metricDetails.forEach(m => {
                attributeMap[m.id] = m.rpg_attribute || 'vitality'
            })

            // Aggregate XP to award per attribute
            const xpPerAttribute: Record<string, number> = {}
            completedMetrics.forEach(entry => {
                const attr = attributeMap[entry.metric_id]
                if (attr) {
                    // Give 10 XP per minute spent, or default 25 XP if no time logged
                    let timeXP = (entry.time_spent && entry.time_spent > 0) ? entry.time_spent * 10 : 25
                    
                    // Double if Hardcore Mode was active and remains active (didn't fail today)
                    if (effectiveHardcore) timeXP *= 2
                    
                    xpPerAttribute[attr] = (xpPerAttribute[attr] || 0) + timeXP
                }
            })

            // Upsert into user_attributes table
            for (const [attrName, xpToAdd] of Object.entries(xpPerAttribute)) {
                await sql`
                    INSERT INTO user_attributes (user_id, attribute_name, total_xp, level)
                    VALUES (${userId}, ${attrName}, ${xpToAdd}, 1)
                    ON CONFLICT (user_id, attribute_name)
                    DO UPDATE SET 
                        total_xp = user_attributes.total_xp + EXCLUDED.total_xp,
                        last_updated = CURRENT_TIMESTAMP
                `

                // Basic leveling logic: Level = floor(sqrt(total_xp) / 10) + 1
                // We'll update level immediately after adding XP
                await sql`
                    UPDATE user_attributes
                    SET level = GREATEST(1, FLOOR(SQRT(total_xp) / 10) + 1)
                    WHERE user_id = ${userId} AND attribute_name = ${attrName}
                `
            }
        }
      }
    } catch (xpErr: any) {
      console.warn('[POST /api/daily] Base/Attribute XP award failed:', xpErr.message)
    }

    // 9. Update Active Quests
    try {
        const completedMetrics = processedEntries.filter(e => e.completed).map(e => e.metric_id);
        
        if (completedMetrics.length > 0) {
            // Fetch quests matching these metrics
            const relevantQuests = await sql`
                SELECT id, target_value, current_value, xp_reward 
                FROM quests 
                WHERE user_id = ${userId} 
                AND status = 'active' 
                AND metric_id = ANY(${sql.array(completedMetrics)}::uuid[])
            `;

            for (const quest of relevantQuests) {
                const newValue = quest.current_value + 1;
                const isCompleted = newValue >= quest.target_value;
                const newStatus = isCompleted ? 'completed' : 'active';

                await sql`
                    UPDATE quests 
                    SET current_value = ${newValue}, status = ${newStatus}
                    WHERE id = ${quest.id}
                `;

                if (isCompleted) {
                    questXpResult = await awardXP(userId, `quest_completed:${quest.id}`, quest.xp_reward);
                }
            }
        }
    } catch (qErr: any) {
         console.warn('[POST /api/daily] Quest update failed:', qErr.message)
    }

    // 10. Evaluate Achievements
    let newlyUnlockedAchievements: any[] = []
    try {
        newlyUnlockedAchievements = await checkAndUnlockAchievements(userId);
    } catch (achErr) {
        console.warn('[POST /api/daily] Achievement evaluation failed:', achErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Daily log saved',
      data: {
          summary: summaryStart[0],
          entries: processedEntries,
          debug_scores: axisScores,
          total_time: totalTimeSpent,
          xp: xpResult,
          quest_xp: questXpResult,
          achievements: newlyUnlockedAchievements,
          loot_drop: lootDrop,
          boss: bossFeedback,
          campaign: campaignFeedback
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('[POST /api/daily] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save daily log', details: error.message },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { format } from 'date-fns'
import { awardXP, XP_PER_LOG, XP_PER_PERFECT_SCORE } from '@/lib/gamification'

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

    return NextResponse.json({
      success: true,
      data: {
          summary: summary[0] || null,
          entries: entries,
          field_values: fieldValues,
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
    const { metric_inputs, field_values } = body // field_values: [{ field_id, metric_id, value_int?, value_bool?, value_text? }]
    
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

    // 1. Fetch Active Cycle & Weights
    // Find cycle that covers logDate
    const cycles = await sql`
        SELECT id FROM priority_cycles
        WHERE start_date <= ${logDate} AND end_date >= ${logDate}
        LIMIT 1
    `
    // If no cycle found, we might need a default or error. 
    // For now, let's assume if no cycle, we behave neutrally or error. 
    // Or we find the *latest* active cycle if dates overlap strangely.
    // Let's grab the weights for this cycle.
    
    let activeWeights: any[] = [];
    if (cycles.length > 0) {
        activeWeights = await sql`
            SELECT axis_id, weight_percentage 
            FROM axis_weights 
            WHERE cycle_id = ${cycles[0].id}
        `
    } else {
         // Fallback: If no active cycle, maybe equal weights? Or fetch all axes and give them equal weight?
         // For now, let's warn and return 0 score or handle gracefully.
         // Let's fetch all (active) axes to compute "Raw Score" at least.
    }

    // 2. Fetch All Active Metrics
    const metrics = await sql`
        SELECT id, axis_id, max_points 
        FROM metrics 
        WHERE active = TRUE
    `
    const metricsMap = new Map(metrics.map(m => [m.id, m]));

    // 3. Calculate Scores per Axis
    const axisScores: Record<string, { raw: number, max: number, weight: number }> = {};
    
    // Initialize axis aggregators
    const allAxes = await sql`SELECT id FROM axes WHERE active = TRUE`;
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
    const processedEntries: Array<{ metric_id: string; completed: boolean; score_awarded: number; time_spent: number | null }> = [];
    for (const input of metric_inputs) {
        const metric = metricsMap.get(input.metric_id);
        if (!metric) continue; // Skip unknown/inactive metrics

        const scoreAwarded = input.completed ? metric.max_points : 0;
        
        if (axisScores[metric.axis_id]) {
            axisScores[metric.axis_id].raw += scoreAwarded;
        }

        processedEntries.push({
            metric_id: input.metric_id,
            completed: input.completed,
            score_awarded: scoreAwarded,
            time_spent: input.time_spent_minutes || null
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
                user_id: userId
            }));

            // Force type casting to avoid "not callable" TS error with postgres.js transaction
            await (tx as any)`
                INSERT INTO daily_entries ${sql(rows, 'date', 'metric_id', 'completed', 'score_awarded', 'time_spent_minutes', 'user_id')}
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
          INSERT INTO daily_field_entries (user_id, metric_id, field_id, date, value_int, value_bool, value_text)
          VALUES (${userId}, ${fv.metric_id}, ${fv.field_id}, ${logDate}, ${fv.value_int ?? null}, ${fv.value_bool ?? null}, ${fv.value_text ?? null})
          ON CONFLICT (user_id, field_id, date)
          DO UPDATE SET
            value_int = EXCLUDED.value_int,
            value_bool = EXCLUDED.value_bool,
            value_text = EXCLUDED.value_text
        `
      }
    }

    // 8. Award XP
    let xpResult = null
    try {
      let xpToAward = XP_PER_LOG
      let xpReason = 'Daily log submitted'
      if (finalScore === 100) {
        xpToAward += XP_PER_PERFECT_SCORE
        xpReason = 'Perfect day! All tasks completed.'
      }
      xpResult = await awardXP(userId, xpReason, xpToAward)
    } catch (xpErr: any) {
      console.warn('[POST /api/daily] XP award failed (non-fatal):', xpErr.message)
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

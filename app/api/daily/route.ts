import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { format } from 'date-fns'

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

    return NextResponse.json({
      success: true,
      data: {
          summary: summary[0] || null,
          entries: entries
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
    const { metric_inputs } = body // Array of { metric_id, completed, time_spent_minutes? }
    
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
    const processedEntries = [];
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

    // 4. Compute Final Weighted Score
    // Formula: Sum of ( (AxisRaw / AxisMax) * AxisWeight )
    let finalScore = 0;
    for (const axisId in axisScores) {
        const { raw, max, weight } = axisScores[axisId];
        if (max > 0 && weight > 0) {
            const axisRatio = raw / max;
            finalScore += axisRatio * weight;
        }
    }
    
    // Round to nearest integer
    finalScore = Math.round(finalScore);


    // --- DATABASE UPDATES ---
    
    // 5. Upsert Daily Summary
    // We determine "mode" roughly based on score for now (can be more complex later)
    let mode = 'Stable';
    if (finalScore > 85) mode = 'Growth';
    else if (finalScore < 60) mode = 'Recovery';

    const summaryStart = await sql`
        INSERT INTO daily_scores (date, total_score, mode, user_id)
        VALUES (${logDate}, ${finalScore}, ${mode}, ${userId})
        ON CONFLICT (date, user_id)
        DO UPDATE SET
            total_score = EXCLUDED.total_score,
            mode = EXCLUDED.mode
        RETURNING *
    `;

    // 6. Upsert Daily Entries
    // We delete old entries for this date/user and re-insert to handle un-checks easily?
    // Or upsert one by one. Re-inserting is safer for "removing" separate items if the list changes?
    // Actually, upsert is fine if we cover all metrics. But if a user unchecks something, we expect "completed=false" sent.
    
    for (const entry of processedEntries) {
        await sql`
            INSERT INTO daily_entries (
                date, metric_id, completed, score_awarded, time_spent_minutes, user_id
            )
            VALUES (
                ${logDate}, 
                ${entry.metric_id}, 
                ${entry.completed}, 
                ${entry.score_awarded}, 
                ${entry.time_spent}, 
                ${userId}
            )
            ON CONFLICT (date, metric_id, user_id)
            DO UPDATE SET
                completed = EXCLUDED.completed,
                score_awarded = EXCLUDED.score_awarded,
                time_spent_minutes = EXCLUDED.time_spent_minutes
        `;
    }

    return NextResponse.json({
      success: true,
      message: 'Daily log saved',
      data: {
          summary: summaryStart[0],
          entries: processedEntries
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

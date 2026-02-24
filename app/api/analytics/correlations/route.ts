import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// Types for better type safety
type Entry = {
    date: string;
    metric_name: string;
    score_awarded: number;
    max_points: number;
    axis_name: string;
};

type GroupedEntries = {
    [date: string]: {
        [metricName: string]: { val: number, axis: string } 
    }
};

export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the last 90 days of entries to get a good dataset for correlations
    const entries = await sql<Entry[]>`
        SELECT 
            de.date, 
            m.name as metric_name, 
            de.score_awarded,
            m.max_points,
            a.name as axis_name
        FROM daily_entries de
        JOIN metrics m ON de.metric_id = m.id
        JOIN axes a ON m.axis_id = a.id
        WHERE de.user_id = ${userId} 
        AND de.date >= CURRENT_DATE - INTERVAL '90 days'
        AND m.active = TRUE
    `

    if (!entries || entries.length === 0) {
        return NextResponse.json({ success: true, data: [] })
    }

    // Process data: Group entries by Date -> Metric -> Normalized Score (0 to 1)
    const dataByDate: GroupedEntries = {};
    const allMetricsSet = new Set<string>();

    entries.forEach(e => {
        const dateStr = new Date(e.date).toISOString().split('T')[0];
        if (!dataByDate[dateStr]) dataByDate[dateStr] = {};
        
        // Normalize score between 0 and 1
        const normalizedScore = e.max_points > 0 ? e.score_awarded / e.max_points : 0;
        
        dataByDate[dateStr][e.metric_name] = {
            val: normalizedScore,
            axis: e.axis_name
        };
        allMetricsSet.add(e.metric_name);
    });

    const allMetrics = Array.from(allMetricsSet);
    const correlations: any[] = [];

    // Calculate correlations: 
    // We want to see how "Source Metric" changes affect "Target Metric" changes.
    // For simplicity, we'll calculate: When Source is High (> 0.7), what is Average Target?
    // And when Source is Low (< 0.4), what is Average Target?
    // The difference is the "Impact Factor".

    allMetrics.forEach(sourceMetric => {
        
        // We only care about sources that have enough variance to be sliding inputs.
        // But for UI sake, we evaluate all of them.

        allMetrics.forEach(targetMetric => {
            if (sourceMetric === targetMetric) return; // Don't correlate to itself

            let targetSumWhenSourceHigh = 0;
            let targetCountWhenSourceHigh = 0;

            let targetSumWhenSourceLow = 0;
            let targetCountWhenSourceLow = 0;

            let targetAxis = "";

            Object.values(dataByDate).forEach((day: any) => {
                const sData = day[sourceMetric];
                const tData = day[targetMetric];

                if (sData !== undefined && tData !== undefined) {
                    targetAxis = tData.axis;

                    if (sData.val >= 0.7) {
                        targetSumWhenSourceHigh += tData.val;
                        targetCountWhenSourceHigh++;
                    } else if (sData.val <= 0.4) {
                        targetSumWhenSourceLow += tData.val;
                        targetCountWhenSourceLow++;
                    }
                }
            });
            
            // We need a minimum amount of data points to feel confident
            if (targetCountWhenSourceHigh > 2 && targetCountWhenSourceLow > 2) {
                const avgTargetWhenHigh = targetSumWhenSourceHigh / targetCountWhenSourceHigh;
                const avgTargetWhenLow = targetSumWhenSourceLow / targetCountWhenSourceLow;
                
                // Impact factor: How much target changes when source goes from Low -> High.
                // Could be negative (e.g., Gaming High -> Study Low)
                const impactFactor = avgTargetWhenHigh - avgTargetWhenLow;

                // Only include meaningful correlations (magnitude > 0.1)
                if (Math.abs(impactFactor) > 0.1) {
                    correlations.push({
                        source_metric_name: sourceMetric,
                        target_metric_name: targetMetric,
                        target_axis: targetAxis,
                        impact_factor: Number(impactFactor.toFixed(2)), // e.g., +0.45 or -0.20
                        base_avg: Number(avgTargetWhenLow.toFixed(2)) // Where target usually sits when source is low
                    });
                }
            }
        });
    });

    // Sort by most impactful first
    correlations.sort((a, b) => Math.abs(b.impact_factor) - Math.abs(a.impact_factor));

    return NextResponse.json({
      success: true,
      data: correlations
    })

  } catch (error: any) {
    console.error('[GET /api/analytics/correlations] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch days where the user performed reasonably well (score > 60)
    // We only want to learn from "good" days to build the constellation of success.
    const goodDaysRaw = await sql<{ date: Date }[]>`
        SELECT date 
        FROM daily_scores 
        WHERE user_id = ${userId} AND total_score > 60
        ORDER BY date DESC
        LIMIT 60
    `

    if (!goodDaysRaw || goodDaysRaw.length === 0) {
        return NextResponse.json({ success: true, data: { nodes: [], links: [] } })
    }

    const goodDays = goodDaysRaw.map(r => r.date.toISOString().split('T')[0])

    // 2. Fetch all entries for those good days
    const entries = await sql<{ date: Date, metric_name: string }[]>`
        SELECT de.date, m.name as metric_name
        FROM daily_entries de
        JOIN metrics m ON de.metric_id = m.id
        WHERE de.user_id = ${userId} 
        AND de.date = ANY(${sql.array(goodDays)}::date[])
        AND de.completed = TRUE
        AND m.active = TRUE
    `

    // 3. Process Co-occurrences
    // Group metrics by day
    const entriesByDay: Record<string, string[]> = {}
    
    entries.forEach(e => {
        const d = e.date.toISOString().split('T')[0]
        if (!entriesByDay[d]) entriesByDay[d] = []
        entriesByDay[d].push(e.metric_name)
    })

    // Count how often metric A and metric B happen on the same day
    const coOccurrenceCount: Record<string, number> = {}
    const nodeFrequencies: Record<string, number> = {}

    Object.values(entriesByDay).forEach(dayMetrics => {
        // Count individual node frequency
        dayMetrics.forEach(m => {
            nodeFrequencies[m] = (nodeFrequencies[m] || 0) + 1;
        });

        // Loop through all unique pairs in this day
        for (let i = 0; i < dayMetrics.length; i++) {
            for (let j = i + 1; j < dayMetrics.length; j++) {
                // Alphabetize to create a consistent pair key (A|B is the same as B|A)
                const pair = [dayMetrics[i], dayMetrics[j]].sort().join('|')
                coOccurrenceCount[pair] = (coOccurrenceCount[pair] || 0) + 1
            }
        }
    })

    // 4. Format for Visualization (Nodes & Links)
    const nodes = Object.entries(nodeFrequencies).map(([name, freq]) => ({
        id: name,
        group: 1, // Optional grouping mechanism
        value: freq // Defines size of the node (star)
    }));

    const links = Object.entries(coOccurrenceCount)
        .filter(([_, weight]) => weight >= 3) // Only keep statistically significant links
        .map(([pair, weight]) => {
            const [source, target] = pair.split('|')
            return { source, target, value: weight } // weight defines opacity/thickness
        });

    return NextResponse.json({
      success: true,
      data: { nodes, links }
    })

  } catch (error: any) {
    console.error('[GET /api/analytics/constellations] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

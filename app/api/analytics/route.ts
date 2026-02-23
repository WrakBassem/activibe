import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { format, subDays } from 'date-fns'

export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const daysToFetch = 7
    const startDate = format(subDays(today, daysToFetch - 1), 'yyyy-MM-dd')
    
    // For heatmap, fetch last 60 days
    const heatmapStartDate = format(subDays(today, 59), 'yyyy-MM-dd')

    // 1. Fetch Weekly Scores (Global Score Trend)
    const weeklyScores = await sql`
        SELECT date, total_score, mode 
        FROM daily_scores
        WHERE user_id = ${userId} AND date >= ${startDate}
        ORDER BY date ASC
    `
    
    // 1b. Fetch Heatmap Scores (Last 60 Days)
    const heatmapScores = await sql`
        SELECT date, total_score, mode 
        FROM daily_scores
        WHERE user_id = ${userId} AND date >= ${heatmapStartDate}
        ORDER BY date ASC
    `

    // 2. Fetch Global Streak
    const allScoresDesc = await sql`
        SELECT date, total_score 
        FROM daily_scores 
        WHERE user_id = ${userId} 
        ORDER BY date DESC 
        LIMIT 60
    `
    
    let globalStreak = 0
    
    if (allScoresDesc.length > 0) {
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const latestLogDate = format(new Date(allScoresDesc[0].date), 'yyyy-MM-dd')
        
        const gap = Math.floor(
            (new Date(todayStr).getTime() - new Date(latestLogDate).getTime()) / (1000 * 3600 * 24)
        )

        if (gap <= 1) {
            let expectedDate = new Date(latestLogDate)
            
            for (const entry of allScoresDesc) {
                const entryDateStr = format(new Date(entry.date), 'yyyy-MM-dd')
                const expectedDateStr = format(expectedDate, 'yyyy-MM-dd')

                if (entryDateStr === expectedDateStr && entry.total_score >= 1) {
                    globalStreak++
                    expectedDate.setDate(expectedDate.getDate() - 1)
                } else {
                    break
                }
            }
        }
    }

    // 3. Fetch Metric Streaks (Top 5 Active)
    const topStreaks = await sql`
        SELECT m.name, s.current_streak, m.icon
        FROM streaks s
        JOIN metrics m ON s.metric_id = m.id
        WHERE s.user_id = ${userId} AND s.current_streak > 0
        ORDER BY s.current_streak DESC
        LIMIT 5
    `

    // 4. Axis Performance (Radar Chart Data)
    const axisPerformance = await sql`
        SELECT a.name as axis, 
               SUM(de.score_awarded) as total_score,
               COUNT(de.id) as entries_count
        FROM daily_entries de
        JOIN metrics m ON de.metric_id = m.id
        JOIN axes a ON m.axis_id = a.id
        WHERE de.user_id = ${userId} AND de.date >= ${startDate}
        GROUP BY a.name
    `

    return NextResponse.json({
      success: true,
      data: {
          weekly_scores: weeklyScores,
          heatmap_scores: heatmapScores,
          global_streak: globalStreak,
          top_streaks: topStreaks,
          axis_performance: axisPerformance
      }
    })

  } catch (error: any) {
    console.error('[GET /api/analytics] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

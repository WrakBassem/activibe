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

    // 1. Fetch Weekly Scores (Global Score Trend)
    const weeklyScores = await sql`
        SELECT date, total_score, mode 
        FROM daily_scores
        WHERE user_id = ${userId} AND date >= ${startDate}
        ORDER BY date ASC
    `

    // 2. Fetch Global Streak
    // Logic: Consecutive days where total_score >= 60 (Active)
    // We just calculate this on the fly from daily_scores for simpler logic
    const allScoresDesc = await sql`
        SELECT date, total_score 
        FROM daily_scores 
        WHERE user_id = ${userId} 
        ORDER BY date DESC 
        LIMIT 30
    `
    
    let globalStreak = 0
    let lastDate = new Date(format(today, 'yyyy-MM-dd')) // normalized today
    
    // Check if we have entry for today or yesterday to start the chain
    // If most recent is > 2 days ago, streak is 0.
    
    if (allScoresDesc.length > 0) {
        // Normalize 'today' to YYYY-MM-DD to avoid time issues
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const latestLogDate = format(new Date(allScoresDesc[0].date), 'yyyy-MM-dd')
        
        // Calculate gap between today and last log
        const gap = Math.floor(
            (new Date(todayStr).getTime() - new Date(latestLogDate).getTime()) / (1000 * 3600 * 24)
        )

        // Streak is broken if gap > 1 (i.e. last log was from day before yesterday or older)
        if (gap <= 1) {
            let expectedDate = new Date(latestLogDate)
            
            for (const entry of allScoresDesc) {
                const entryDateStr = format(new Date(entry.date), 'yyyy-MM-dd')
                const expectedDateStr = format(expectedDate, 'yyyy-MM-dd')

                if (entryDateStr === expectedDateStr && entry.total_score >= 1) { // Any valid log counts
                    globalStreak++
                    // Next expected is 1 day before
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

    // 4. Axis Performance (Radar Chart Data) - Last 7 Days average
    // Join daily_entries -> metrics -> axes
    // Avg score_awarded / max_points
    
    // First get max points per axis (approximate, assumes const max points)
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
    // Note: total_score is raw points. To get %, we need potential max. 
    // This is hard to do purely in SQL without knowing exactly which metrics were active on which days.
    // Simplifying for V2: Just return raw points per axis for Bar Chart comparison.

    return NextResponse.json({
      success: true,
      data: {
          weekly_scores: weeklyScores,
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

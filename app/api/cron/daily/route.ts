import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { sendTelegramMessage } from '@/lib/telegram'
import { generateDailyAnalysis } from '@/lib/gemini'

// Helper to format time (HH:MM:SS -> HH:MM)
const fmtTime = (t: string) => t ? t.substring(0, 5) : ''
// Helper for priority icons
const priorityIcon = (p: string) => ({ high: '🔴', medium: '🟡', low: '🔵', none: '⚪' }[p] || '⚪')

// Secure Cron Job
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const phase = searchParams.get('phase')
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch all users with Telegram configured
    const users = await sql`
      SELECT user_id, telegram_chat_id 
      FROM user_profile 
      WHERE telegram_chat_id IS NOT NULL
    `

    if (users.length === 0) {
      return NextResponse.json({ message: 'No users with Telegram configured' })
    }

    const results = []

    // 2. Loop through each user
    for (const user of users) {
      const userId = user.user_id
      const chatId = user.telegram_chat_id

      try {
        // ═══════════════════════════════════════════
        // 🌅 MORNING PHASE (Agenda + Yesterday Recap)
        // ═══════════════════════════════════════════
        if (phase === 'morning') {
          // Fetch today's active metrics grouped by axis + yesterday's performance
          const dataRows = await sql`
            WITH active_metrics AS (
                SELECT m.id, m.name, m.max_points, m.input_type,
                       a.name as axis_name, a.id as axis_id
                FROM metrics m
                JOIN axes a ON m.axis_id = a.id
                WHERE m.active = TRUE AND a.active = TRUE
            ),
            yesterday_entries AS (
                SELECT de.metric_id, de.completed, de.score_awarded, de.score_value, de.review,
                       m.name as metric_name, m.max_points, m.input_type
                FROM daily_entries de
                JOIN metrics m ON de.metric_id = m.id
                WHERE de.date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 1
                  AND de.user_id = ${userId}
            ),
            yesterday_score AS (
                SELECT ds.total_score, ds.mode
                FROM daily_scores ds
                WHERE ds.date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 1
                  AND ds.user_id = ${userId}
            )
            SELECT
                (SELECT COALESCE(json_agg(json_build_object(
                    'name', name, 'max_points', max_points, 'input_type', input_type,
                    'axis_name', axis_name, 'axis_id', axis_id
                ) ORDER BY axis_name, name), '[]'::json) FROM active_metrics) as today_metrics,
                (SELECT COALESCE(json_agg(json_build_object(
                    'metric_name', metric_name, 'completed', completed,
                    'score_awarded', score_awarded, 'max_points', max_points,
                    'score_value', score_value, 'input_type', input_type,
                    'review', review
                )), '[]'::json) FROM yesterday_entries) as y_entries,
                (SELECT total_score FROM yesterday_score) as y_score,
                (SELECT mode FROM yesterday_score) as y_mode
          `
          const data = dataRows[0]
          const todayMetrics = data.today_metrics || []
          const yEntries = data.y_entries || []

          const dayName = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Tunis' })
          const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Africa/Tunis' })

          // Motivational openers rotating by day
          const openers: Record<string, string> = {
            'Monday': '🚀 New week, new chapter. Let\'s set the pace.',
            'Tuesday': '⚡ Momentum is building. Keep pushing.',
            'Wednesday': '🏔️ Midweek summit. Stay locked in.',
            'Thursday': '🎯 The finish line is in sight. Execute.',
            'Friday': '🔥 Close the week strong. No loose ends.',
            'Saturday': '🧠 Strategic recovery day. Sharpen the saw.',
            'Sunday': '🌱 Reset & recharge. Prepare for what\'s next.',
          }
          const opener = openers[dayOfWeek] || '💪 Another day, another chance to level up.'

          let msg = `┌─────────────────────────┐\n`
          msg += `  🌅 *MORNING BRIEFING*\n`
          msg += `  📅 ${dayName}\n`
          msg += `└─────────────────────────┘\n\n`
          msg += `_${opener}_\n`

          // Yesterday Recap
          if (data.y_score) {
            const yScore = Math.round(Number(data.y_score))
            const yScoreEmoji = yScore >= 85 ? '🟢' : yScore >= 70 ? '🟡' : yScore >= 50 ? '🟠' : '🔴'
            msg += `\n📊 *Yesterday:* ${yScoreEmoji} *${yScore}/100*`
            if (data.y_mode) msg += ` — ${data.y_mode}`
            msg += `\n`

            // Show per-metric scores from yesterday
            if (yEntries.length > 0) {
              const completed = yEntries.filter((e: any) => e.completed).length
              const total = yEntries.length
              const pct = Math.round((completed / total) * 100)
              const bar = pct >= 80 ? '█████' : pct >= 60 ? '████░' : pct >= 40 ? '███░░' : pct >= 20 ? '██░░░' : '█░░░░'
              msg += `${bar} Metrics: ${completed}/${total} (${pct}%)\n`

              // Highlight struggles (below 50% score)
              const struggles = yEntries.filter((e: any) => !e.completed || (e.max_points > 0 && (e.score_awarded / e.max_points) < 0.5))
              if (struggles.length > 0 && struggles.length <= 3) {
                msg += `⚠️ Focus today: ${struggles.map((s: any) => s.metric_name).join(', ')}\n`
              }
            }
          }

          // Today's Metrics by Axis
          if (todayMetrics.length > 0) {
            // Group by axis
            const byAxis: Record<string, any[]> = {}
            for (const m of todayMetrics) {
              if (!byAxis[m.axis_name]) byAxis[m.axis_name] = []
              byAxis[m.axis_name].push(m)
            }

            msg += `\n📐 *Today's Evaluation (${todayMetrics.length} metrics):*\n`
            const axisEmojis: Record<string, string> = {}
            let emojiIdx = 0
            const defaultEmojis = ['🧠', '💪', '🎯', '🌱', '❤️', '📚', '💼', '🎨']

            for (const [axisName, metrics] of Object.entries(byAxis)) {
              const emoji = defaultEmojis[emojiIdx++ % defaultEmojis.length]
              const totalPts = metrics.reduce((sum: number, m: any) => sum + m.max_points, 0)
              const metricList = metrics.map((m: any) => {
                const typeLabel = m.input_type === 'emoji_5' ? '😊' : m.input_type === 'scale_0_5' ? '⑤' : m.input_type === 'scale_0_10' ? '⑩' : '☑️'
                return `${typeLabel} ${m.name}`
              }).join(', ')
              msg += `${emoji} *${axisName}* (${totalPts}pt): ${metricList}\n`
            }

            const totalMaxPts = todayMetrics.reduce((sum: number, m: any) => sum + m.max_points, 0)
            msg += `\n💎 Total possible: *${totalMaxPts} points*\n`
          }

          msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`
          msg += `📝 [Log your day](${process.env.NEXT_PUBLIC_APP_URL || 'https://activibe-silk.vercel.app'}/daily) | 💬 [Ask Coach](${process.env.NEXT_PUBLIC_APP_URL || 'https://activibe-silk.vercel.app'}/coach)`

          await sendTelegramMessage(msg.trim(), chatId)
          results.push({ userId, status: 'sent', phase: 'morning' })
        }

        // ═══════════════════════════════════════════
        // 🌙 EVENING PHASE (Daily Report)
        // ═══════════════════════════════════════════
        if (phase === 'evening') {
          // 1. Check if log exists
          const checkRows = await sql`
            SELECT COUNT(*) as count 
            FROM daily_scores 
            WHERE date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
              AND user_id = ${userId}
          `
          
          if (Number(checkRows[0].count) === 0) {
            // Creative rotating reminders
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://activibe-silk.vercel.app'
            const hour = new Date().getHours()
            
            // Check logging streak for context
            const streakRows = await sql`
              SELECT COUNT(*) as streak FROM (
                SELECT date, date - ROW_NUMBER() OVER (ORDER BY date)::INT * INTERVAL '1 day' as grp
                FROM daily_scores WHERE user_id = ${userId} ORDER BY date DESC
              ) sub WHERE grp = (
                SELECT date - ROW_NUMBER() OVER (ORDER BY date)::INT * INTERVAL '1 day'
                FROM daily_scores WHERE date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 1 AND user_id = ${userId} LIMIT 1
              )
            `
            const currentStreak = Number(streakRows[0]?.streak || 0)
            
            const reminders = [
              `🔔 *Day Not Yet Captured*\n\nYour data tells a story that numbers alone can't. Every unlogged day is a missing chapter.\n\n${currentStreak > 0 ? `🔥 You have a *${currentStreak}-day streak* on the line. Don't let it go.\n\n` : ''}📝 _5 minutes now saves a week of guessing later._\n\n[📊 Log Now](${appUrl}/daily)`,
              `⏳ *The Clock Is Ticking*\n\nToday's insights fade fast. The details you remember now will be gone by tomorrow.\n\n${currentStreak > 0 ? `📈 *${currentStreak} consecutive days* of self-awareness. Keep building.\n\n` : ''}💡 _What gets measured gets managed. What gets tracked gets transformed._\n\n[✍️ Capture Today](${appUrl}/daily)`,
              `🎯 *Quick Reminder*\n\nYour future self will thank you for logging today. Every data point is fuel for smarter coaching.\n\n${currentStreak > 0 ? `🏆 Current streak: *${currentStreak} days*. Tomorrow's report depends on tonight's input.\n\n` : ''}⚡ _The gap between who you are and who you want to be is filled with consistency._\n\n[📋 Open Daily Log](${appUrl}/daily)`,
              `🌙 *Evening Check-In*\n\nBefore the day ends — how did you show up today? Your metrics and reviews power the AI insights you rely on.\n\n${currentStreak > 0 ? `🔗 *${currentStreak}-day chain* — one log away from making it ${currentStreak + 1}.\n\n` : ''}🧠 _Reflection is the bridge between experience and wisdom._\n\n[📝 Reflect & Log](${appUrl}/daily)`,
            ]
            
            const reminderIdx = new Date().getDate() % reminders.length
            const reminder = reminders[reminderIdx]

            await sendTelegramMessage(reminder, chatId)
            results.push({ userId, status: 'reminder_sent', phase: 'evening' })
            continue; // Skip the rest for this user
          }

          // 2. Fetch Full Data from daily_scores (the actual table)
          const fullDataRows = await sql`
            WITH score_data AS (
                SELECT 
                    ds.date, ds.total_score, ds.mode,
                    ds.burnout_flag, ds.procrastination_flag
                FROM daily_scores ds
                WHERE ds.user_id = ${userId}
                  AND ds.date <= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
                ORDER BY ds.date DESC
                LIMIT 8
            ),
            trends AS (
                SELECT *,
                    LAG(total_score) OVER (ORDER BY date) as score_yesterday,
                    ROUND(AVG(total_score) OVER (ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 0) as score_3day_avg,
                    ROUND(AVG(total_score) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 0) as score_7day_avg
                FROM score_data
            ),
            log_streak AS (
                SELECT COUNT(*) as streak
                FROM (
                    SELECT date,
                           date - ROW_NUMBER() OVER (ORDER BY date)::INT * INTERVAL '1 day' as grp
                    FROM daily_scores
                    WHERE date <= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
                      AND user_id = ${userId}
                    ORDER BY date DESC
                ) sub
                WHERE grp = (SELECT date - ROW_NUMBER() OVER (ORDER BY date)::INT * INTERVAL '1 day'
                             FROM daily_scores
                             WHERE date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
                               AND user_id = ${userId}
                             LIMIT 1)
            )
            SELECT 
                t.date as log_date, t.total_score as final_score, t.mode,
                t.burnout_flag, t.procrastination_flag,
                t.score_yesterday, t.score_3day_avg, t.score_7day_avg,
                (SELECT streak FROM log_streak) as logging_streak
            FROM trends t
            ORDER BY t.date DESC
            LIMIT 1;
          `
          
          const reportData = fullDataRows[0]
          if (!reportData) {
              results.push({ userId, status: 'no_data', phase: 'evening' })
              continue
          }

          // 2b. Fetch sub-metric field values for today
          const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' }) // YYYY-MM-DD

          // 2c. Fetch reviews and score values from daily_entries for today
          const dailyEntryRows = await sql`
              SELECT 
                  de.metric_id, m.name, m.input_type, m.max_points,
                  de.completed, de.score_awarded, de.score_value, de.review,
                  CASE WHEN s.current_streak IS NULL THEN 0 ELSE s.current_streak END as streak
              FROM daily_entries de
              JOIN metrics m ON de.metric_id = m.id
              LEFT JOIN streaks s ON m.id = s.metric_id AND s.user_id = ${userId}
              WHERE de.user_id = ${userId} AND de.date = ${todayStr}
          `
          const metricItems = dailyEntryRows.map((i: any) => ({
              name: i.name,
              completed: i.completed,
              score_awarded: i.score_awarded,
              max: i.max_points,
              streak: i.streak,
              input_type: i.input_type || 'boolean',
              score_value: i.score_value,
              review: i.review || null,
          }))

          const subFieldRows = await sql`
              SELECT 
                  m.name as metric_name,
                  mf.label as field_label,
                  mf.name as field_name,
                  mf.field_type,
                  dfe.value_int,
                  dfe.value_bool,
                  dfe.value_text
              FROM daily_field_entries dfe
              JOIN metric_fields mf ON dfe.field_id = mf.id
              JOIN metrics m ON dfe.metric_id = m.id
              WHERE dfe.user_id = ${userId} AND dfe.date = ${todayStr}
              ORDER BY m.name, mf.sort_order
          `
          // Group by metric name
          const subFieldsByMetric: Record<string, any[]> = {}
          for (const sf of subFieldRows) {
              if (!subFieldsByMetric[sf.metric_name]) subFieldsByMetric[sf.metric_name] = []
              subFieldsByMetric[sf.metric_name].push({
                  field: sf.field_label || sf.field_name,
                  type: sf.field_type,
                  value: sf.field_type === 'boolean' ? sf.value_bool
                      : sf.field_type === 'text' ? sf.value_text
                      : sf.value_int
              })
          }

          // 3. AI Analysis (with sub-metric data + reviews + score values)
          const aiData = { ...reportData, items: metricItems, sub_metric_fields: subFieldsByMetric }
          const aiAnalysis = await generateDailyAnalysis(aiData)

          // 4. Format Message
          const score = Math.round(Number(reportData.final_score) || 0)
          
          // Formatting helpers
          const arrow = (cur: number, avg: number) => {
            if (!avg) return ''
            const diff = cur - avg
            if (Math.abs(diff) < 0.5) return '➡️'
            return diff > 0 ? '📈' : '📉'
          }
          const scoreBar = (pct: number) => {
            const filled = Math.round(pct / 10)
            return '▓'.repeat(Math.min(filled, 10)) + '░'.repeat(Math.max(10 - filled, 0))
          }

          let scoreEmoji = '🔴'
          let scoreLabel = 'Alert'
          if (score >= 85) { scoreLabel = 'Excellent'; scoreEmoji = '🟢' }
          else if (score >= 70) { scoreLabel = 'Good'; scoreEmoji = '🟡' }
          else if (score >= 55) { scoreLabel = 'Average'; scoreEmoji = '🟠' }
          else if (score >= 40) { scoreLabel = 'Unstable'; scoreEmoji = '🟠' }

          // Use mode from DB or derive from score
          let mode = reportData.mode ? `🏷 ${reportData.mode}` : '⚓ Steady'
          if (reportData.burnout_flag) mode = '🧯 Burnout Risk'
          else if (reportData.procrastination_flag) mode = '⚠️ Slump'

          const dayName = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Tunis' })
          
          let msg = `┌─────────────────────────┐\n`
          msg += `  🌙 *DAILY INTELLIGENCE REPORT*\n`
          msg += `  📅 ${dayName}\n`
          msg += `└─────────────────────────┘\n\n`

          // Score hero section
          msg += `${scoreEmoji} *${score}/100* — ${scoreLabel}\n`
          msg += `${scoreBar(score)} ${mode}\n\n`

          // Score trends
          const scoreTrend = arrow(score, Number(reportData.score_7day_avg))
          if (reportData.score_7day_avg || reportData.score_yesterday) {
            msg += `━━━ 📊 Score Trends ━━━\n`
            if (reportData.score_yesterday) msg += `Yesterday: ${Math.round(Number(reportData.score_yesterday))}/100\n`
            if (reportData.score_3day_avg) msg += `3-day avg: ${Math.round(Number(reportData.score_3day_avg))}/100\n`
            if (reportData.score_7day_avg) msg += `7-day avg: ${Math.round(Number(reportData.score_7day_avg))}/100 ${scoreTrend}\n`
            if (reportData.logging_streak) msg += `🔥 Streak: ${reportData.logging_streak} days\n`
            msg += `\n`
          }

          // Metric scores breakdown (input-type aware)
          if (metricItems.length > 0) {
            msg += `━━━ 📊 Metrics ━━━\n`
            for (const item of metricItems) {
              const pct = item.max > 0 ? Math.round((item.score_awarded / item.max) * 100) : 0
              let statusIcon = item.completed ? '✅' : '❌'
              let scoreStr = `${item.score_awarded}/${item.max}pt`
              
              if (item.input_type === 'emoji_5' && item.score_value != null) {
                const emojis = ['', '😞', '😕', '😐', '🙂', '😄']
                statusIcon = emojis[item.score_value] || '😐'
                scoreStr = `${item.score_value}/5 → ${item.score_awarded}pt`
              } else if (item.input_type === 'scale_0_5' && item.score_value != null) {
                statusIcon = pct >= 80 ? '💪' : pct >= 50 ? '🔶' : '⚠️'
                scoreStr = `${item.score_value}/5 → ${item.score_awarded}pt`
              } else if (item.input_type === 'scale_0_10' && item.score_value != null) {
                statusIcon = pct >= 80 ? '💪' : pct >= 50 ? '🔶' : '⚠️'
                scoreStr = `${item.score_value}/10 → ${item.score_awarded}pt`
              }
              
              msg += `${statusIcon} ${item.name}: *${scoreStr}*`
              if (item.streak > 0) msg += ` 🔥${item.streak}`
              msg += `\n`
            }
            
            // Review highlights
            const reviewedItems = metricItems.filter((i: any) => i.review)
            if (reviewedItems.length > 0) {
              msg += `\n━━━ 📝 Your Reviews ━━━\n`
              for (const item of reviewedItems.slice(0, 3)) {
                const shortReview = item.review.length > 80 ? item.review.substring(0, 77) + '...' : item.review
                msg += `💬 *${item.name}:* _"${shortReview}"_\n`
              }
              if (reviewedItems.length > 3) {
                msg += `_...and ${reviewedItems.length - 3} more reviews_\n`
              }
            }
            msg += `\n`
          }

          // AI Content
          msg += `━━━ 🤖 AI Coach ━━━\n${aiAnalysis}`

          await sendTelegramMessage(msg.trim(), chatId)
          results.push({ userId, status: 'sent', phase: 'evening' })
        }

      } catch (err: any) {
        console.error(`Error processing user ${userId}:`, err)
        results.push({ userId, status: 'error', error: err.message })
      }
    }

    return NextResponse.json({ success: true, phase, results })

  } catch (error: any) {
    console.error('[CRON] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

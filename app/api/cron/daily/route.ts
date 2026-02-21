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
          const dataRows = await sql`
            WITH today_items AS (
                SELECT id, title, type, target_time, duration_minutes, priority
                FROM tracking_items
                WHERE is_active = TRUE
                  AND user_id = ${userId}
                  AND frequency_days::TEXT LIKE '%' || EXTRACT(DOW FROM (NOW() AT TIME ZONE 'Africa/Tunis')::DATE)::INT::TEXT || '%'
                  AND (start_date IS NULL OR (NOW() AT TIME ZONE 'Africa/Tunis')::DATE >= start_date::DATE)
                  AND (end_date IS NULL OR (NOW() AT TIME ZONE 'Africa/Tunis')::DATE <= end_date::DATE)
            ),
            yesterday_performance AS (
                SELECT 
                    COUNT(*) FILTER (WHERE ti.type = 'habit' AND dil.completed = TRUE) as habits_done,
                    COUNT(*) FILTER (WHERE ti.type = 'habit') as habits_total,
                    COUNT(*) FILTER (WHERE ti.type = 'task' AND dil.completed = TRUE) as tasks_done,
                    COUNT(*) FILTER (WHERE ti.type = 'task') as tasks_total,
                    ROUND(AVG(dil.rating) FILTER (WHERE dil.rating IS NOT NULL AND dil.rating > 0), 1) as avg_habit_rating
                FROM daily_item_logs dil
                JOIN tracking_items ti ON dil.item_id = ti.id
                WHERE dil.log_date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 1
                  AND dil.user_id = ${userId}
            ),
            yesterday_metrics AS (
                SELECT d.sleep_hours, s.final_score
                FROM daily_logs d
                LEFT JOIN daily_final_score s ON d.log_date = s.log_date AND d.user_id = s.user_id
                WHERE d.log_date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 1
                  AND d.user_id = ${userId}
            )
            SELECT 
                (SELECT COALESCE(json_agg(json_build_object('title', title, 'target_time', target_time, 'duration', duration_minutes, 'priority', priority) ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, target_time ASC NULLS LAST), '[]'::json) FROM today_items WHERE type = 'habit') as today_habits,
                (SELECT COALESCE(json_agg(json_build_object('title', title, 'target_time', target_time, 'duration', duration_minutes, 'priority', priority) ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, target_time ASC NULLS LAST), '[]'::json) FROM today_items WHERE type = 'task') as today_tasks,
                yp.habits_done as y_habits_done, yp.habits_total as y_habits_total,
                yp.tasks_done as y_tasks_done, yp.tasks_total as y_tasks_total,
                yp.avg_habit_rating as y_avg_rating,
                ym.sleep_hours as y_sleep, ym.final_score as y_score
            FROM yesterday_performance yp
            LEFT JOIN yesterday_metrics ym ON TRUE;
          `
          const data = dataRows[0]

          // Format Message
          const habits = data.today_habits || []
          const tasks = data.today_tasks || []
          
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

          // Yesterday Recap (compact & insightful)
          if (data.y_habits_total > 0 || data.y_tasks_total > 0) {
            const yScore = data.y_score ? Math.round(data.y_score) : null
            const yScoreEmoji = yScore ? (yScore >= 85 ? '🟢' : yScore >= 70 ? '🟡' : yScore >= 50 ? '🟠' : '🔴') : ''
            msg += `\n📊 *Yesterday:*`
            if (yScore) msg += ` ${yScoreEmoji} ${yScore}/100`
            if (data.y_sleep) msg += ` • 🌙 ${Number(data.y_sleep).toFixed(1)}h`
            msg += `\n`
            
            const hRate = data.y_habits_total > 0 ? Math.round((data.y_habits_done / data.y_habits_total) * 100) : 0
            if (data.y_habits_total > 0) {
              const bar = hRate >= 80 ? '█████' : hRate >= 60 ? '████░' : hRate >= 40 ? '███░░' : hRate >= 20 ? '██░░░' : '█░░░░'
              msg += `${bar} Habits: ${data.y_habits_done}/${data.y_habits_total} (${hRate}%)`
              if (data.y_avg_rating) msg += ` ⭐${Number(data.y_avg_rating).toFixed(1)}`
              msg += `\n`
            }
          }

          // Today's Habits
          if (habits.length > 0) {
            msg += `\n🔄 *Today's Rituals (${habits.length}):*\n`
            habits.forEach((h: any) => {
              const meta = [fmtTime(h.target_time), h.duration ? `${h.duration}m` : ''].filter(Boolean).join(' • ')
              msg += `  ${priorityIcon(h.priority)} ${h.title}`
              if (meta) msg += ` _${meta}_`
              msg += `\n`
            })
          }

          // Today's Tasks
          if (tasks.length > 0) {
            msg += `\n📋 *Key Tasks (${tasks.length}):*\n`
            tasks.forEach((t: any) => {
              const meta = [fmtTime(t.target_time), t.duration ? `${t.duration}m` : ''].filter(Boolean).join(' • ')
              msg += `  ${priorityIcon(t.priority)} ${t.title}`
              if (meta) msg += ` _${meta}_`
              msg += `\n`
            })
          }

          const totalMinutes = [...habits, ...tasks].reduce((sum: number, i: any) => sum + (Number(i.duration) || 0), 0)
          if (totalMinutes > 0) {
            const hrs = Math.floor(totalMinutes / 60)
            const mins = totalMinutes % 60
            msg += `\n⏱ *Focus Load:* ${hrs > 0 ? `${hrs}h ` : ''}${mins}m`
            if (totalMinutes > 300) msg += ` ⚠️ Heavy day — protect your energy`
            else if (totalMinutes < 60) msg += ` 💡 Light load — great day for deep work`
            msg += `\n`
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
            FROM daily_logs 
            WHERE log_date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
              AND user_id = ${userId}
          `
          
          if (Number(checkRows[0].count) === 0) {
            // Creative rotating reminders
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://activibe-silk.vercel.app'
            const hour = new Date().getHours()
            
            // Check logging streak for context
            const streakRows = await sql`
              SELECT COUNT(*) as streak FROM (
                SELECT log_date, log_date - ROW_NUMBER() OVER (ORDER BY log_date)::INT * INTERVAL '1 day' as grp
                FROM daily_logs WHERE user_id = ${userId} ORDER BY log_date DESC
              ) sub WHERE grp = (
                SELECT log_date - ROW_NUMBER() OVER (ORDER BY log_date)::INT * INTERVAL '1 day'
                FROM daily_logs WHERE log_date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 1 AND user_id = ${userId} LIMIT 1
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

          // 2. Fetch Full Data
          const fullDataRows = await sql`
            WITH base_data AS (
                SELECT 
                    d.log_date, d.sleep_hours, d.sleep_quality, d.food_quality,
                    d.focus_minutes, d.mood, d.activity_level,
                    d.habits_score, d.tasks_done,
                    s.final_score
                FROM daily_logs d
                LEFT JOIN daily_final_score s ON d.log_date = s.log_date AND d.user_id = s.user_id
                WHERE d.log_date <= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
                  AND d.user_id = ${userId}
            ),
            trends AS (
                SELECT *,
                    LAG(sleep_hours) OVER (ORDER BY log_date) as sleep_yesterday,
                    LAG(focus_minutes) OVER (ORDER BY log_date) as focus_yesterday,
                    LAG(final_score) OVER (ORDER BY log_date) as score_yesterday,
                    LAG(mood) OVER (ORDER BY log_date) as mood_yesterday,
                    ROUND(AVG(sleep_hours) OVER (ORDER BY log_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) as sleep_3day_avg,
                    ROUND(AVG(focus_minutes) OVER (ORDER BY log_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 0) as focus_3day_avg,
                    ROUND(AVG(final_score) OVER (ORDER BY log_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 0) as score_3day_avg,
                    ROUND(AVG(mood) OVER (ORDER BY log_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) as mood_3day_avg,
                    ROUND(AVG(sleep_hours) OVER (ORDER BY log_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 1) as sleep_7day_avg,
                    ROUND(AVG(focus_minutes) OVER (ORDER BY log_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 0) as focus_7day_avg,
                    ROUND(AVG(final_score) OVER (ORDER BY log_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 0) as score_7day_avg,
                    ROUND(AVG(mood) OVER (ORDER BY log_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 1) as mood_7day_avg
                FROM base_data
            ),
            today_items AS (
                SELECT ti.id, ti.title, ti.type, ti.priority, dil.completed, dil.rating
                FROM daily_item_logs dil
                JOIN tracking_items ti ON dil.item_id = ti.id
                WHERE dil.log_date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
                  AND dil.user_id = ${userId}
            ),
            item_summary AS (
                SELECT
                    COUNT(*) FILTER (WHERE type = 'habit' AND completed = TRUE) as habits_completed,
                    COUNT(*) FILTER (WHERE type = 'habit') as habits_total,
                    ROUND(AVG(rating) FILTER (WHERE type = 'habit' AND rating IS NOT NULL AND rating > 0), 1) as avg_habit_rating,
                    COUNT(*) FILTER (WHERE type = 'task' AND completed = TRUE) as tasks_completed,
                    COUNT(*) FILTER (WHERE type = 'task') as tasks_total,
                    COALESCE(json_agg(json_build_object('title', title, 'type', type, 'completed', completed, 'rating', rating, 'priority', priority)) FILTER (WHERE title IS NOT NULL), '[]'::json) as items_detail
                FROM today_items
            ),
            habit_history AS (
                SELECT 
                    ti.title as habit_title,
                    COUNT(*) as scheduled_days,
                    COUNT(*) FILTER (WHERE dil.completed = TRUE) as completed_days,
                    ROUND(AVG(dil.rating) FILTER (WHERE dil.rating IS NOT NULL AND dil.rating > 0), 1) as avg_rating_7d,
                    ROUND((COUNT(*) FILTER (WHERE dil.completed = TRUE))::NUMERIC / NULLIF(COUNT(*), 0) * 100, 0) as completion_pct
                FROM daily_item_logs dil
                JOIN tracking_items ti ON dil.item_id = ti.id
                WHERE ti.type = 'habit'
                  AND dil.log_date >= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 7
                  AND dil.log_date <= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
                  AND dil.user_id = ${userId}
                GROUP BY ti.title
            ),
            log_streak AS (
                SELECT COUNT(*) as streak
                FROM (
                    SELECT log_date,
                           log_date - ROW_NUMBER() OVER (ORDER BY log_date)::INT * INTERVAL '1 day' as grp
                    FROM daily_logs
                    WHERE log_date <= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
                      AND user_id = ${userId}
                    ORDER BY log_date DESC
                ) sub
                WHERE grp = (SELECT log_date - ROW_NUMBER() OVER (ORDER BY log_date)::INT * INTERVAL '1 day'
                             FROM daily_logs
                             WHERE log_date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
                               AND user_id = ${userId}
                             LIMIT 1)
            ),
            weekly_habits AS (
                SELECT 
                    ROUND((COUNT(*) FILTER (WHERE dil.completed = TRUE AND dil.log_date >= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 6))::NUMERIC
                        / NULLIF(COUNT(*) FILTER (WHERE dil.log_date >= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 6), 0) * 100, 0) as this_week_pct,
                    ROUND((COUNT(*) FILTER (WHERE dil.completed = TRUE AND dil.log_date >= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 13 AND dil.log_date < (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 6))::NUMERIC
                        / NULLIF(COUNT(*) FILTER (WHERE dil.log_date >= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 13 AND dil.log_date < (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 6), 0) * 100, 0) as last_week_pct
                FROM daily_item_logs dil
                JOIN tracking_items ti ON dil.item_id = ti.id
                WHERE ti.type = 'habit'
                  AND ti.user_id = ${userId}
            )
            SELECT 
                t.log_date, t.sleep_hours, t.sleep_quality, t.food_quality,
                t.focus_minutes, t.mood, t.activity_level, t.habits_score, t.tasks_done, t.final_score,
                t.sleep_yesterday, t.focus_yesterday, t.score_yesterday, t.mood_yesterday,
                t.sleep_3day_avg, t.focus_3day_avg, t.score_3day_avg, t.mood_3day_avg,
                t.sleep_7day_avg, t.focus_7day_avg, t.score_7day_avg, t.mood_7day_avg,
                i.habits_completed, i.habits_total, i.avg_habit_rating,
                i.tasks_completed, i.tasks_total, i.items_detail,
                (SELECT COALESCE(json_agg(json_build_object('habit', habit_title, 'done', completed_days, 'scheduled', scheduled_days, 'pct', completion_pct, 'avg_rating', avg_rating_7d)), '[]'::json) FROM habit_history) as habit_7d_history,
                (SELECT streak FROM log_streak) as logging_streak,
                wh.this_week_pct as habits_this_week_pct,
                wh.last_week_pct as habits_last_week_pct
            FROM trends t, item_summary i, weekly_habits wh
            ORDER BY t.log_date DESC
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
          const sleep = Number(reportData.sleep_hours) || 0
          const mood = Number(reportData.mood) || 0
          
          // Formatting helpers
          const arrow = (cur: number, avg: number) => {
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

          let mode = '⚓ Steady Mode' 
          if (Number(reportData.focus_minutes) > 240 && score > 80) mode = '🔥 High Output Mode'
          else if (Number(reportData.focus_minutes) > 180 && mood > 1) mode = '🧠 Deep Focus Mode'
          else if (score > 75 && sleep > 7) mode = '🔋 Growth Mode'
          else if (sleep < 5 || score < 50 || mood < -1) mode = '🧯 Recovery Mode'

          const dayName = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Tunis' })
          
          let msg = `┌─────────────────────────┐\n`
          msg += `  🌙 *DAILY INTELLIGENCE REPORT*\n`
          msg += `  📅 ${dayName}\n`
          msg += `└─────────────────────────┘\n\n`

          // Score hero section
          msg += `${scoreEmoji} *${score}/100* — ${scoreLabel}\n`
          msg += `${scoreBar(score)} ${mode}\n\n`

          // Biometrics block
          msg += `━━━ 🔬 Biometrics ━━━\n`
          msg += `🌙 Sleep: *${sleep.toFixed(1)}h* (Q${reportData.sleep_quality}/5) ${arrow(sleep, Number(reportData.sleep_7day_avg))}\n`
          msg += `🎯 Focus: *${reportData.focus_minutes}m* ${arrow(Number(reportData.focus_minutes), Number(reportData.focus_7day_avg))}\n`
          msg += `😊 Mood: *${mood.toFixed(1)}* ${arrow(mood, Number(reportData.mood_7day_avg))}\n`
          msg += `🏃 Activity: ${reportData.activity_level} • 🍎 Food: ${reportData.food_quality}/5\n\n`

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

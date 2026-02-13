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
    // ═══════════════════════════════════════════
    // 🌅 MORNING PHASE (Agenda + Yesterday Recap)
    // ═══════════════════════════════════════════
    if (phase === 'morning') {
      const dataRows = await sql`
        WITH today_items AS (
            SELECT id, title, type, target_time, duration_minutes, priority
            FROM tracking_items
            WHERE is_active = TRUE
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
        ),
        yesterday_metrics AS (
            SELECT d.sleep_hours, s.final_score
            FROM daily_logs d
            LEFT JOIN daily_final_score s ON d.log_date = s.log_date
            WHERE d.log_date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 1
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

      let msg = `🌅 *MORNING BRIEFING*\n📅 ${dayName}\n`

      // Yesterday Recap
      if (data.y_habits_total > 0 || data.y_tasks_total > 0) {
        msg += `\n📊 *Yesterday's Recap:*\n`
        if (data.y_score) msg += `Score: ${Math.round(data.y_score)}/100 `
        if (data.y_sleep) msg += `• Sleep: ${Number(data.y_sleep).toFixed(1)}h\n`
        
        const hRate = data.y_habits_total > 0 ? Math.round((data.y_habits_done / data.y_habits_total) * 100) : 0
        if (data.y_habits_total > 0) msg += `Habits: ${data.y_habits_done}/${data.y_habits_total} (${hRate}%)`
        if (data.y_avg_rating) msg += ` ⭐ ${Number(data.y_avg_rating).toFixed(1)}`
        msg += '\n'
      }

      // Today's Habits
      if (habits.length > 0) {
        msg += `\n✅ *Habits (${habits.length}):*\n`
        habits.forEach((h: any) => {
          const meta = [fmtTime(h.target_time), h.duration ? `${h.duration}m` : ''].filter(Boolean).join(' • ')
          msg += `  ${priorityIcon(h.priority)} ${h.title}`
          if (meta) msg += ` — ${meta}`
          msg += '\n'
        })
      }

      // Today's Tasks
      if (tasks.length > 0) {
        msg += `\n📋 *Tasks (${tasks.length}):*\n`
        tasks.forEach((t: any) => {
          const meta = [fmtTime(t.target_time), t.duration ? `${t.duration}m` : ''].filter(Boolean).join(' • ')
          msg += `  ${priorityIcon(t.priority)} ${t.title}`
          if (meta) msg += ` — ${meta}`
          msg += '\n'
        })
      }

      const totalMinutes = [...habits, ...tasks].reduce((sum: number, i: any) => sum + (Number(i.duration) || 0), 0)
      if (totalMinutes > 0) {
        msg += `\n⏱ *Est. Focus Load:* ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m\n`
      }

      msg += `\n🔗 Open Daily Log: ${process.env.NEXT_PUBLIC_APP_URL || 'https://activibe-silk.vercel.app'}/daily`

      await sendTelegramMessage(msg.trim())
      return NextResponse.json({ success: true, phase: 'morning', sent: true })
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
      `
      
      if (Number(checkRows[0].count) === 0) {
        // Send Reminder
        const reminder = `⚠️ *You haven't logged today!*\n\n📝 Don't break the chain — log your day now:\n🔗 ${process.env.NEXT_PUBLIC_APP_URL || 'https://activibe-silk.vercel.app'}/daily\n\n_Consistency is the compound interest of self-improvement._`
        await sendTelegramMessage(reminder)
        return NextResponse.json({ success: true, phase: 'evening', type: 'reminder' })
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
            LEFT JOIN daily_final_score s ON d.log_date = s.log_date
            WHERE d.log_date <= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
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
            GROUP BY ti.title
        ),
        log_streak AS (
            SELECT COUNT(*) as streak
            FROM (
                SELECT log_date,
                       log_date - ROW_NUMBER() OVER (ORDER BY log_date)::INT * INTERVAL '1 day' as grp
                FROM daily_logs
                WHERE log_date <= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
                ORDER BY log_date DESC
            ) sub
            WHERE grp = (SELECT log_date - ROW_NUMBER() OVER (ORDER BY log_date)::INT * INTERVAL '1 day'
                         FROM daily_logs
                         WHERE log_date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
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
      if (!reportData) return NextResponse.json({ error: 'No data found' }, { status: 404 })

      // 3. AI Analysis
      const aiAnalysis = await generateDailyAnalysis(reportData)

      // 4. Format Message
      const score = Math.round(Number(reportData.final_score) || 0)
      const sleep = Number(reportData.sleep_hours) || 0
      const mood = Number(reportData.mood) || 0
      
      // Basic formatting helpers
      const arrow = (cur: number, avg: number) => {
        const diff = cur - avg
        if (Math.abs(diff) < 0.5) return '➡️'
        return diff > 0 ? '📈' : '📉'
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
      
      let msg = `🌙 *DAILY INTELLIGENCE REPORT*\n📅 ${dayName}\n\n`
      msg += `${scoreEmoji} *Score: ${score}/100* — ${scoreLabel}\n🏷 *${mode}*\n\n`
      
      msg += `━━━ Biometrics ━━━\n`
      msg += `🌙 Sleep: ${sleep.toFixed(1)}h (Q: ${reportData.sleep_quality}/5) ${arrow(sleep, Number(reportData.sleep_7day_avg))}\n`
      msg += `🎯 Focus: ${reportData.focus_minutes}m ${arrow(Number(reportData.focus_minutes), Number(reportData.focus_7day_avg))}\n`
      msg += `😊 Mood: ${mood.toFixed(1)} ${arrow(mood, Number(reportData.mood_7day_avg))}\n`
      msg += `🏃 Activity: ${reportData.activity_level}\n`
      msg += `🍎 Food: ${reportData.food_quality}/5\n\n`

      // AI Content
      msg += `━━━ 🤖 AI Coach ━━━\n${aiAnalysis}`

      await sendTelegramMessage(msg.trim())
      return NextResponse.json({ success: true, phase: 'evening', sent: true })
    }

    return NextResponse.json({ error: 'Invalid phase' }, { status: 400 })

  } catch (error: any) {
    console.error('[CRON] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

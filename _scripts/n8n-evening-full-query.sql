-- Evening Full Query v2: Deep Analytics Edition
-- Combines: metrics + trends + habits/tasks + per-habit history + streaks + weekly comparison

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
        -- Yesterday
        LAG(sleep_hours) OVER (ORDER BY log_date) as sleep_yesterday,
        LAG(focus_minutes) OVER (ORDER BY log_date) as focus_yesterday,
        LAG(final_score) OVER (ORDER BY log_date) as score_yesterday,
        LAG(mood) OVER (ORDER BY log_date) as mood_yesterday,
        -- 3-Day Averages
        ROUND(AVG(sleep_hours) OVER (ORDER BY log_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) as sleep_3day_avg,
        ROUND(AVG(focus_minutes) OVER (ORDER BY log_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 0) as focus_3day_avg,
        ROUND(AVG(final_score) OVER (ORDER BY log_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 0) as score_3day_avg,
        ROUND(AVG(mood) OVER (ORDER BY log_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) as mood_3day_avg,
        -- 7-Day Averages
        ROUND(AVG(sleep_hours) OVER (ORDER BY log_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 1) as sleep_7day_avg,
        ROUND(AVG(focus_minutes) OVER (ORDER BY log_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 0) as focus_7day_avg,
        ROUND(AVG(final_score) OVER (ORDER BY log_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 0) as score_7day_avg,
        ROUND(AVG(mood) OVER (ORDER BY log_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 1) as mood_7day_avg
    FROM base_data
),
-- Today's individual items
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
        COALESCE(json_agg(json_build_object(
            'title', title, 'type', type, 'completed', completed, 
            'rating', rating, 'priority', priority
        )) FILTER (WHERE title IS NOT NULL), '[]'::json) as items_detail
    FROM today_items
),
-- Per-habit 7-day history: completion rate and avg rating per habit
habit_history AS (
    SELECT 
        ti.title as habit_title,
        COUNT(*) as scheduled_days,
        COUNT(*) FILTER (WHERE dil.completed = TRUE) as completed_days,
        ROUND(AVG(dil.rating) FILTER (WHERE dil.rating IS NOT NULL AND dil.rating > 0), 1) as avg_rating_7d,
        ROUND(
            (COUNT(*) FILTER (WHERE dil.completed = TRUE))::NUMERIC 
            / NULLIF(COUNT(*), 0) * 100, 0
        ) as completion_pct
    FROM daily_item_logs dil
    JOIN tracking_items ti ON dil.item_id = ti.id
    WHERE ti.type = 'habit'
      AND dil.log_date >= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 7
      AND dil.log_date <= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
    GROUP BY ti.title
),
-- Logging streak: consecutive days with a daily log
log_streak AS (
    SELECT COUNT(*) as streak
    FROM (
        SELECT log_date,
               log_date - ROW_NUMBER() OVER (ORDER BY log_date)::INT * INTERVAL '1 day' as grp
        FROM daily_logs
        WHERE log_date <= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
        ORDER BY log_date DESC
    ) sub
    WHERE grp = (
        SELECT log_date - ROW_NUMBER() OVER (ORDER BY log_date)::INT * INTERVAL '1 day'
        FROM daily_logs
        WHERE log_date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
        LIMIT 1
    )
),
-- Weekly comparison: this week vs last week habit completion %
weekly_habits AS (
    SELECT 
        ROUND(
            (COUNT(*) FILTER (WHERE dil.completed = TRUE 
                AND dil.log_date >= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 6))::NUMERIC
            / NULLIF(COUNT(*) FILTER (WHERE dil.log_date >= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 6), 0) * 100, 0
        ) as this_week_pct,
        ROUND(
            (COUNT(*) FILTER (WHERE dil.completed = TRUE 
                AND dil.log_date >= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 13 
                AND dil.log_date < (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 6))::NUMERIC
            / NULLIF(COUNT(*) FILTER (WHERE dil.log_date >= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 13 
                AND dil.log_date < (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 6), 0) * 100, 0
        ) as last_week_pct
    FROM daily_item_logs dil
    JOIN tracking_items ti ON dil.item_id = ti.id
    WHERE ti.type = 'habit'
)
SELECT 
    t.log_date, t.sleep_hours, t.sleep_quality, t.food_quality,
    t.focus_minutes, t.mood, t.activity_level, t.habits_score, t.tasks_done, t.final_score,
    -- Trends
    t.sleep_yesterday, t.focus_yesterday, t.score_yesterday, t.mood_yesterday,
    t.sleep_3day_avg, t.focus_3day_avg, t.score_3day_avg, t.mood_3day_avg,
    t.sleep_7day_avg, t.focus_7day_avg, t.score_7day_avg, t.mood_7day_avg,
    -- Today's items summary
    i.habits_completed, i.habits_total, i.avg_habit_rating,
    i.tasks_completed, i.tasks_total, i.items_detail,
    -- Per-habit 7d history
    (SELECT COALESCE(json_agg(json_build_object(
        'habit', habit_title, 'done', completed_days, 'scheduled', scheduled_days, 
        'pct', completion_pct, 'avg_rating', avg_rating_7d
    )), '[]'::json) FROM habit_history) as habit_7d_history,
    -- Streak & Weekly
    (SELECT streak FROM log_streak) as logging_streak,
    wh.this_week_pct as habits_this_week_pct,
    wh.last_week_pct as habits_last_week_pct
FROM trends t, item_summary i, weekly_habits wh
ORDER BY t.log_date DESC
LIMIT 1;

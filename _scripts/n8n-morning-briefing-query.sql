-- Morning Briefing: Today's Agenda + Yesterday's Performance Context
-- Returns a single JSON object with habits, tasks, and yesterday's stats

WITH today_items AS (
    SELECT 
        id,
        title,
        type,
        target_time,
        duration_minutes,
        priority
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
    SELECT 
        d.sleep_hours,
        s.final_score
    FROM daily_logs d
    LEFT JOIN daily_final_score s ON d.log_date = s.log_date
    WHERE d.log_date = (NOW() AT TIME ZONE 'Africa/Tunis')::DATE - 1
)
SELECT 
    -- Today's Habits
    (SELECT COALESCE(json_agg(
        json_build_object(
            'title', title,
            'target_time', target_time,
            'duration', duration_minutes,
            'priority', priority
        ) ORDER BY 
            CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
            target_time ASC NULLS LAST
    ), '[]'::json) FROM today_items WHERE type = 'habit') as today_habits,
    
    -- Today's Tasks
    (SELECT COALESCE(json_agg(
        json_build_object(
            'title', title,
            'target_time', target_time,
            'duration', duration_minutes,
            'priority', priority
        ) ORDER BY 
            CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
            target_time ASC NULLS LAST
    ), '[]'::json) FROM today_items WHERE type = 'task') as today_tasks,
    
    -- Counts
    (SELECT COUNT(*) FROM today_items WHERE type = 'habit') as habit_count,
    (SELECT COUNT(*) FROM today_items WHERE type = 'task') as task_count,
    
    -- Yesterday's Performance
    yp.habits_done as y_habits_done,
    yp.habits_total as y_habits_total,
    yp.tasks_done as y_tasks_done,
    yp.tasks_total as y_tasks_total,
    yp.avg_habit_rating as y_avg_rating,
    ym.sleep_hours as y_sleep,
    ym.final_score as y_score
FROM yesterday_performance yp
LEFT JOIN yesterday_metrics ym ON TRUE;

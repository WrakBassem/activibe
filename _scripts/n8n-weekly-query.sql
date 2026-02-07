// SQL Query for n8n Postgres Node
// Using CTEs to get current and previous week data in one go

WITH current_week AS (
    SELECT 
        AVG(sleep_hours) as avg_sleep,
        AVG(focus_minutes) as avg_focus,
        AVG(mood) as avg_mood,
        AVG(activity_level) as avg_activity,
        AVG(final_score) as avg_score,
        COUNT(*) as log_count
    FROM daily_logs 
    WHERE log_date >= CURRENT_DATE - 7
),
prev_week AS (
    SELECT 
        AVG(sleep_hours) as avg_sleep,
        AVG(focus_minutes) as avg_focus,
        AVG(mood) as avg_mood,
        AVG(activity_level) as avg_activity,
        AVG(final_score) as avg_score
    FROM daily_logs 
    WHERE log_date >= CURRENT_DATE - 14 AND log_date < CURRENT_DATE - 7
)
SELECT * FROM current_week, prev_week;

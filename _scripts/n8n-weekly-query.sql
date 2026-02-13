-- SQL Query for n8n Postgres Node
-- Using CTEs to get current and previous week data in one go

WITH current_week AS (
    SELECT 
        AVG(d.sleep_hours) as avg_sleep,
        AVG(d.focus_minutes) as avg_focus,
        AVG(d.mood) as avg_mood,
        AVG(d.activity_level) as avg_activity,
        AVG(s.final_score::NUMERIC) as avg_score,
        COUNT(*) as log_count
    FROM daily_logs d
    JOIN daily_final_score s ON d.log_date = s.log_date
    WHERE d.log_date::DATE >= CURRENT_DATE - 7
),
prev_week AS (
    SELECT 
        AVG(d.sleep_hours) as prev_sleep,
        AVG(d.focus_minutes) as prev_focus,
        AVG(d.mood) as prev_mood,
        AVG(d.activity_level) as prev_activity,
        AVG(s.final_score::NUMERIC) as prev_score
    FROM daily_logs d
    JOIN daily_final_score s ON d.log_date = s.log_date
    WHERE d.log_date::DATE >= CURRENT_DATE - 14 AND d.log_date::DATE < CURRENT_DATE - 7
)
SELECT 
    current_week.*,
    prev_week.*,
    (avg_sleep - prev_sleep) as sleep_diff,
    (avg_focus - prev_focus) as focus_diff,
    (avg_mood - prev_mood) as mood_diff,
    (avg_activity - prev_activity) as activity_diff,
    (avg_score - prev_score) as score_diff
FROM current_week, prev_week;

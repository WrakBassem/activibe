/* 
  Corrected SQL Query for n8n 
  - Joins daily_logs with daily_final_score view
  - Casts final_score to NUMERIC for AVG calculation
*/

WITH current_week AS (
    SELECT 
        AVG(d.sleep_hours) as avg_sleep,
        AVG(d.focus_minutes) as avg_focus,
        AVG(d.mood) as avg_mood,
        AVG(d.activity_level) as avg_activity,
        AVG(s.final_score::NUMERIC) as avg_score
    FROM daily_logs d
    JOIN daily_final_score s ON d.log_date = s.log_date
    WHERE d.log_date >= CURRENT_DATE - 7
),
prev_week AS (
    SELECT 
        AVG(d.sleep_hours) as prev_sleep,
        AVG(d.focus_minutes) as prev_focus,
        AVG(s.final_score::NUMERIC) as prev_score
    FROM daily_logs d
    JOIN daily_final_score s ON d.log_date = s.log_date
    WHERE d.log_date >= CURRENT_DATE - 14 AND d.log_date < CURRENT_DATE - 7
)
SELECT * FROM current_week, prev_week;

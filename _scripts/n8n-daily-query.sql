-- Phase 3: Unified Logic & Trend Analysis
-- Calculates Today, Yesterday, 3-Day Avg, and 7-Day Avg for Key Metrics
WITH base_data AS (
    SELECT 
        d.log_date,
        d.sleep_hours,
        d.focus_minutes,
        d.mood,
        d.activity_level,
        s.final_score
    FROM daily_logs d
    LEFT JOIN daily_final_score s ON d.log_date = s.log_date
    WHERE d.log_date <= (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
),
trends AS (
    SELECT 
        *,
        -- 1. Yesterday (Lag 1)
        LAG(sleep_hours) OVER (ORDER BY log_date) as sleep_yesterday,
        LAG(focus_minutes) OVER (ORDER BY log_date) as focus_yesterday,
        LAG(final_score) OVER (ORDER BY log_date) as score_yesterday,

        -- 2. 3-Day Average (Current + 2 previous)
        ROUND(AVG(sleep_hours) OVER (ORDER BY log_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) as sleep_3day_avg,
        ROUND(AVG(focus_minutes) OVER (ORDER BY log_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 0) as focus_3day_avg,
        ROUND(AVG(final_score) OVER (ORDER BY log_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 0) as score_3day_avg,

        -- 3. 7-Day Average (Current + 6 previous)
        ROUND(AVG(sleep_hours) OVER (ORDER BY log_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 1) as sleep_7day_avg,
        ROUND(AVG(focus_minutes) OVER (ORDER BY log_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 0) as focus_7day_avg,
        ROUND(AVG(final_score) OVER (ORDER BY log_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 0) as score_7day_avg
    FROM base_data
)
SELECT * FROM trends
ORDER BY log_date DESC
LIMIT 1;

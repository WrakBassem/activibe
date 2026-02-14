 SELECT log_date,
        CASE
            WHEN sleep_hours < 5::numeric THEN 0
            WHEN sleep_hours < 6::numeric THEN 4
            WHEN sleep_hours < 7::numeric THEN 8
            WHEN sleep_hours <= 8::numeric THEN 12
            ELSE 10
        END AS sleep_duration_pts,
        CASE sleep_quality
            WHEN 1 THEN 0
            WHEN 2 THEN 2
            WHEN 3 THEN 4
            WHEN 4 THEN 6
            WHEN 5 THEN 8
            ELSE 0
        END AS sleep_quality_pts,
        CASE food_quality
            WHEN 1 THEN 0
            WHEN 2 THEN 5
            WHEN 3 THEN 9
            WHEN 4 THEN 12
            WHEN 5 THEN 15
            ELSE 0
        END AS food_pts,
        CASE activity_level
            WHEN 0 THEN 0
            WHEN 1 THEN 4
            WHEN 2 THEN 7
            WHEN 3 THEN 10
            WHEN 4 THEN 13
            WHEN 5 THEN 15
            ELSE 0
        END AS activity_pts,
        CASE
            WHEN focus_minutes = 0 OR focus_minutes IS NULL THEN 0
            WHEN focus_minutes <= 30 THEN 4
            WHEN focus_minutes <= 60 THEN 8
            WHEN focus_minutes <= 90 THEN 12
            WHEN focus_minutes <= 150 THEN 16
            ELSE 20
        END AS focus_pts,
    COALESCE(habits_score, 0)::numeric / 5.0 * 15::numeric AS habits_pts,
    LEAST(COALESCE(tasks_done, 0), 5) * 2 AS tasks_pts,
        CASE mood
            WHEN '-2'::integer THEN 0::numeric
            WHEN '-1'::integer THEN 1::numeric
            WHEN 0 THEN 2.5
            WHEN 1 THEN 4::numeric
            WHEN 2 THEN 5::numeric
            ELSE 0::numeric
        END AS mood_pts
   FROM daily_logs;
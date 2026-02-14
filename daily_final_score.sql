 SELECT d.log_date,
    d.sleep_hours,
    d.activity_level,
    d.food_quality,
    d.focus_minutes,
    d.habits_score,
    d.tasks_done,
    s.sleep_duration_pts,
    s.sleep_quality_pts,
    s.food_pts,
    s.activity_pts,
    s.focus_pts,
    s.habits_pts,
    s.tasks_pts,
    s.mood_pts,
        CASE
            WHEN d.sleep_hours < 6::numeric AND lag(d.sleep_hours) OVER (ORDER BY d.log_date) < 6::numeric THEN '-10'::integer
            ELSE 0
        END AS fatigue_penalty,
        CASE
            WHEN d.activity_level <= 1 AND d.food_quality <= 2 AND d.focus_minutes > 120 THEN '-5'::integer
            ELSE 0
        END AS imbalance_penalty,
        CASE
            WHEN d.habits_score = 5 AND d.tasks_done >= 3 THEN 5
            ELSE 0
        END AS discipline_bonus,
    LEAST(GREATEST((s.sleep_duration_pts + s.sleep_quality_pts + s.food_pts + s.activity_pts + s.focus_pts)::numeric + s.habits_pts + s.tasks_pts::numeric + s.mood_pts +
        CASE
            WHEN d.sleep_hours < 6::numeric AND lag(d.sleep_hours) OVER (ORDER BY d.log_date) < 6::numeric THEN '-10'::integer
            ELSE 0
        END::numeric +
        CASE
            WHEN d.activity_level <= 1 AND d.food_quality <= 2 AND d.focus_minutes > 120 THEN '-5'::integer
            ELSE 0
        END::numeric +
        CASE
            WHEN d.habits_score = 5 AND d.tasks_done >= 3 THEN 5
            ELSE 0
        END::numeric, 0::numeric), 100::numeric) AS final_score
   FROM daily_logs d
     JOIN daily_scores s ON d.log_date = s.log_date;
-- Morning Reminder: Fetch today's active Habits & Tasks
SELECT 
    id,
    title,
    type,
    frequency_days,
    target_time,
    duration_minutes,
    priority,
    start_date,
    end_date
FROM tracking_items
WHERE is_active = TRUE
  AND frequency_days::TEXT LIKE '%' || EXTRACT(DOW FROM (NOW() AT TIME ZONE 'Africa/Tunis')::DATE)::INT::TEXT || '%'
  AND (start_date IS NULL OR (NOW() AT TIME ZONE 'Africa/Tunis')::DATE >= start_date::DATE)
  AND (end_date IS NULL OR (NOW() AT TIME ZONE 'Africa/Tunis')::DATE <= end_date::DATE)
ORDER BY 
    type ASC,
    CASE priority
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        ELSE 4
    END,
    target_time ASC NULLS LAST;

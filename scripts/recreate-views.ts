import 'dotenv/config';
import postgres from 'postgres';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');
if (!connectionString) process.exit(1);

const sql = postgres(connectionString, { ssl: 'require' });

async function recreateViews() {
  try {
    console.log('Dropping existing views...');
    await sql`DROP VIEW IF EXISTS daily_final_score`;
    await sql`DROP VIEW IF EXISTS daily_scores`;

    console.log('Creating daily_scores view...');
    await sql`
      CREATE VIEW daily_scores AS
      SELECT 
        log_date,
        user_id,
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
    `;

    console.log('Creating daily_final_score view...');
    await sql`
      CREATE VIEW daily_final_score AS
      SELECT 
        d.log_date,
        d.user_id,
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
            WHEN d.sleep_hours < 6::numeric AND lag(d.sleep_hours) OVER (PARTITION BY d.user_id ORDER BY d.log_date) < 6::numeric THEN '-10'::integer
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
            WHEN d.sleep_hours < 6::numeric AND lag(d.sleep_hours) OVER (PARTITION BY d.user_id ORDER BY d.log_date) < 6::numeric THEN '-10'::integer
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
      JOIN daily_scores s ON d.log_date = s.log_date AND d.user_id = s.user_id;
    `;

    console.log('Views recreated successfully.');
  } catch (error) {
    console.error('Error recreating views:', error);
  } finally {
    await sql.end();
  }
}

recreateViews();

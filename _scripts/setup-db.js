// Setup POS Database Schema
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) acc[key.trim()] = valueParts.join('=').trim();
  return acc;
}, {});

// Use DIRECT_URL for Supabase connection
const connectionString = envVars.DIRECT_URL || envVars.DATABASE_URL;

console.log("Connecting to Supabase...");

const sql = postgres(connectionString, {
  ssl: 'require',
});

async function setupDatabase() {
  try {
    console.log("🚀 Starting Database Setup for POS...");

    // 1. Create daily_logs table
    console.log("Creating table 'daily_logs'...");
    await sql`
      CREATE TABLE IF NOT EXISTS daily_logs (
        id SERIAL PRIMARY KEY,
        log_date DATE UNIQUE NOT NULL,

        sleep_hours NUMERIC(3,1),
        sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 5),

        food_quality INT CHECK (food_quality BETWEEN 1 AND 5),
        activity_level INT CHECK (activity_level BETWEEN 0 AND 5),

        focus_minutes INT,
        habits_score INT CHECK (habits_score BETWEEN 0 AND 5),
        tasks_done INT CHECK (tasks_done BETWEEN 0 AND 5),

        mood INT CHECK (mood BETWEEN -2 AND 2),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Table 'daily_logs' created.");

    // 1.5 Create tracking_items (Habits/Tasks Definitions)
    console.log("Creating table 'tracking_items'...");
    await sql`
      CREATE TABLE IF NOT EXISTS tracking_items (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT CHECK (type IN ('habit', 'task')) NOT NULL,
        frequency_days JSONB DEFAULT '[0,1,2,3,4,5,6]', -- Array of day indexes (0=Sun, 1=Mon...)
        target_time TEXT, -- e.g. "08:00"
        duration_minutes INT DEFAULT 0,
        priority TEXT CHECK (priority IN ('none', 'low', 'medium', 'high')) DEFAULT 'none',
        start_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Table 'tracking_items' created.");

    // 1.6 Create daily_item_logs (Completions)
    console.log("Creating table 'daily_item_logs'...");
    await sql`
      CREATE TABLE IF NOT EXISTS daily_item_logs (
        id SERIAL PRIMARY KEY,
        log_date DATE NOT NULL,
        item_id INT REFERENCES tracking_items(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT FALSE,
        rating INT CHECK (rating BETWEEN 1 AND 5), -- New: 1-5 Star Rating for Habits
        completed_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(log_date, item_id)
      );
    `;
    console.log("✅ Table 'daily_item_logs' created.");

    // --- PHASE 5 MIGRATION (Safe Alter) ---
    console.log("🔄 Checking for Phase 5 migrations...");
    try {
      await sql`ALTER TABLE tracking_items ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE`;
      await sql`ALTER TABLE tracking_items ADD COLUMN IF NOT EXISTS end_date DATE`;
      await sql`ALTER TABLE daily_item_logs ADD COLUMN IF NOT EXISTS rating INT CHECK (rating BETWEEN 1 AND 5)`;
      console.log("✅ Phase 5 Migrations applied (columns added if missing).");
    } catch (e) {
      console.log("⚠️ Migration note: " + e.message);
    }
    // --------------------------------------

    // 2. Create daily_scores view
    // ... rest of script ...

    // 2. Create daily_scores view
    // Calculates raw points for each category based on the rules
    console.log("Creating view 'daily_scores'...");
    await sql`DROP VIEW IF EXISTS daily_final_score;`; // Drop dependent view first if exists
    await sql`DROP VIEW IF EXISTS daily_scores;`;
    
    await sql`
      CREATE OR REPLACE VIEW daily_scores AS
      SELECT
        log_date,
        
        /* =====================
           SOMMEIL (20 pts)
           ===================== */
        -- Durée (12 pts)
        CASE
          WHEN sleep_hours < 5 THEN 0
          WHEN sleep_hours < 6 THEN 4
          WHEN sleep_hours < 7 THEN 8
          WHEN sleep_hours <= 8 THEN 12
          ELSE 10
        END AS sleep_duration_pts,

        -- Qualité (8 pts)
        CASE sleep_quality
          WHEN 1 THEN 0
          WHEN 2 THEN 2
          WHEN 3 THEN 4
          WHEN 4 THEN 6
          WHEN 5 THEN 8
          ELSE 0
        END AS sleep_quality_pts,

        /* =====================
           ALIMENTATION (15 pts)
           ===================== */
        CASE food_quality
          WHEN 1 THEN 0
          WHEN 2 THEN 5
          WHEN 3 THEN 9
          WHEN 4 THEN 12
          WHEN 5 THEN 15
          ELSE 0
        END AS food_pts,

        /* =====================
           ACTIVITÉ (15 pts)
           ===================== */
        CASE activity_level
          WHEN 0 THEN 0
          WHEN 1 THEN 4
          WHEN 2 THEN 7
          WHEN 3 THEN 10
          WHEN 4 THEN 13
          WHEN 5 THEN 15
          ELSE 0
        END AS activity_pts,

        /* =====================
           FOCUS (20 pts)
           ===================== */
        CASE
          WHEN focus_minutes = 0 OR focus_minutes IS NULL THEN 0
          WHEN focus_minutes <= 30 THEN 4
          WHEN focus_minutes <= 60 THEN 8
          WHEN focus_minutes <= 90 THEN 12
          WHEN focus_minutes <= 150 THEN 16
          ELSE 20
        END AS focus_pts,

        /* =====================
           HABITUDES (15 pts)
           ===================== */
        (COALESCE(habits_score, 0) / 5.0) * 15 AS habits_pts,

        /* =====================
           TÂCHES (10 pts)
           ===================== */
        LEAST(COALESCE(tasks_done, 0), 5) * 2 AS tasks_pts,

        /* =====================
           MOOD (5 pts)
           ===================== */
        CASE mood
          WHEN -2 THEN 0
          WHEN -1 THEN 1
          WHEN 0 THEN 2.5
          WHEN 1 THEN 4
          WHEN 2 THEN 5
          ELSE 0
        END AS mood_pts

      FROM daily_logs;
    `;
    console.log("✅ View 'daily_scores' created.");

    // 3. Create daily_final_score view
    // Aggregates points and applies penalties/bonuses
    console.log("Creating view 'daily_final_score'...");
    
    await sql`
      CREATE OR REPLACE VIEW daily_final_score AS
      SELECT
        d.log_date,
        d.sleep_hours,
        d.activity_level,
        d.food_quality,
        d.focus_minutes,
        d.habits_score,
        d.tasks_done,

        -- Raw Score Parts (for debug/display)
        s.sleep_duration_pts,
        s.sleep_quality_pts,
        s.food_pts,
        s.activity_pts,
        s.focus_pts,
        s.habits_pts,
        s.tasks_pts,
        s.mood_pts,
        
        -- Penalties & Bonuses Logic
        CASE
          WHEN d.sleep_hours < 6
           AND LAG(d.sleep_hours) OVER (ORDER BY d.log_date) < 6
          THEN -10 ELSE 0
        END AS fatigue_penalty,

        CASE
          WHEN d.activity_level <= 1
           AND d.food_quality <= 2
           AND d.focus_minutes > 120
          THEN -5 ELSE 0
        END AS imbalance_penalty,

        CASE
          WHEN d.habits_score = 5
           AND d.tasks_done >= 3
          THEN 5 ELSE 0
        END AS discipline_bonus,

        -- FINAL SCORE CALCULATION
        LEAST(
          GREATEST( -- Ensure score doesn't go below 0 if desired, though spec implies raw sum
            (
              s.sleep_duration_pts +
              s.sleep_quality_pts +
              s.food_pts +
              s.activity_pts +
              s.focus_pts +
              s.habits_pts +
              s.tasks_pts +
              s.mood_pts
            )
            +
            CASE
              WHEN d.sleep_hours < 6
               AND LAG(d.sleep_hours) OVER (ORDER BY d.log_date) < 6
              THEN -10 ELSE 0
            END
            +
            CASE
              WHEN d.activity_level <= 1
               AND d.food_quality <= 2
               AND d.focus_minutes > 120
              THEN -5 ELSE 0
            END
            +
            CASE
              WHEN d.habits_score = 5
               AND d.tasks_done >= 3
              THEN 5 ELSE 0
            END,
            0 
          ),
          100 -- Cap at 100
        ) AS final_score

      FROM daily_logs d
      JOIN daily_scores s ON d.log_date = s.log_date;
    `;
    console.log("✅ View 'daily_final_score' created.");

    console.log("\n🎉 Database schema setup complete!");
    
  } catch (err) {
    console.error("❌ Setup failed:", err);
  } finally {
    await sql.end();
  }
}

setupDatabase();

// Setup System Architecture V2 Database Schema
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

const connectionString = envVars.DIRECT_URL || envVars.DATABASE_URL;

console.log("Connecting to Supabase...");

const sql = postgres(connectionString, {
  ssl: 'require',
});

async function setupV2DB() {
  try {
    console.log("🚀 Starting System V2 Database Setup...");

    // 1. Create axes table
    console.log("Creating table 'axes'...");
    await sql`
      CREATE TABLE IF NOT EXISTS axes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Table 'axes' created.");

    // 2. Create metrics table
    console.log("Creating table 'metrics'...");
    await sql`
      CREATE TABLE IF NOT EXISTS metrics (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        axis_id UUID REFERENCES axes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        rule_description TEXT,
        max_points INTEGER DEFAULT 0,
        difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Table 'metrics' created.");

    // 3. Create priority_cycles table
    console.log("Creating table 'priority_cycles'...");
    await sql`
      CREATE TABLE IF NOT EXISTS priority_cycles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Table 'priority_cycles' created.");

    // 4. Create axis_weights table
    console.log("Creating table 'axis_weights'...");
    await sql`
      CREATE TABLE IF NOT EXISTS axis_weights (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        cycle_id UUID REFERENCES priority_cycles(id) ON DELETE CASCADE,
        axis_id UUID REFERENCES axes(id) ON DELETE CASCADE,
        weight_percentage INTEGER NOT NULL CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cycle_id, axis_id)
      );
    `;
    console.log("✅ Table 'axis_weights' created.");

    // 5. Create daily_entries table (Detailed Log)
    // Note: 'daily_entries' stores the result of each metric for a day
    console.log("Creating table 'daily_entries'...");
    await sql`
      CREATE TABLE IF NOT EXISTS daily_entries (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        date DATE NOT NULL,
        metric_id UUID REFERENCES metrics(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT FALSE,
        score_awarded INTEGER DEFAULT 0,
        time_spent_minutes INTEGER,
        user_id UUID, 
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, metric_id, user_id)
      );
    `;
    console.log("✅ Table 'daily_entries' created.");

    // 6. Create daily_scores table (Dashboard Summary)
    // This is useful for quick dashboard rendering without re-calculating everything
    console.log("Creating table 'daily_scores'...");
    await sql`
      CREATE TABLE IF NOT EXISTS daily_scores (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        date DATE NOT NULL,
        total_score INTEGER DEFAULT 0,
        mode TEXT, -- e.g. "Stable", "Recovery", "Growth"
        burnout_flag BOOLEAN DEFAULT FALSE,
        procrastination_flag BOOLEAN DEFAULT FALSE,
        user_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, user_id)
      );
    `;
    console.log("✅ Table 'daily_scores' created.");

    // 7. Create streaks table
    console.log("Creating table 'streaks'...");
    await sql`
      CREATE TABLE IF NOT EXISTS streaks (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        metric_id UUID REFERENCES metrics(id) ON DELETE CASCADE,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_log_date DATE,
        user_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metric_id, user_id)
      );
    `;
    console.log("✅ Table 'streaks' created.");

    console.log("\n🎉 System V2 database setup complete!");

  } catch (err) {
    console.error("❌ Setup failed:", err);
  } finally {
    await sql.end();
  }
}

setupV2DB();

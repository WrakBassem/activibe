// Setup AI Coach Database Schema
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

async function setupCoachDB() {
  try {
    console.log("🚀 Starting AI Coach Database Setup...");

    // 1. Create user_profile table
    console.log("Creating table 'user_profile'...");
    await sql`
      CREATE TABLE IF NOT EXISTS user_profile (
        id SERIAL PRIMARY KEY,
        core_values JSONB DEFAULT '[]',
        goals JSONB DEFAULT '[]',
        keep JSONB DEFAULT '[]',
        quit JSONB DEFAULT '[]',
        life_areas JSONB DEFAULT '{}',
        onboarding_complete BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Table 'user_profile' created.");

    // 2. Create coach_goals table
    console.log("Creating table 'coach_goals'...");
    await sql`
      CREATE TABLE IF NOT EXISTS coach_goals (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        deadline DATE,
        milestones JSONB DEFAULT '[]',
        status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
        motivation_why TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Table 'coach_goals' created.");

    // 3. Create coach_sessions table
    console.log("Creating table 'coach_sessions'...");
    await sql`
      CREATE TABLE IF NOT EXISTS coach_sessions (
        id SERIAL PRIMARY KEY,
        session_type TEXT CHECK (session_type IN ('onboarding', 'check-in', 'planning', 'motivation')) DEFAULT 'check-in',
        messages JSONB DEFAULT '[]',
        summary TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Table 'coach_sessions' created.");

    // 4. Add goal_id to tracking_items (safe migration)
    console.log("🔄 Adding goal_id to tracking_items...");
    try {
      await sql`ALTER TABLE tracking_items ADD COLUMN IF NOT EXISTS goal_id INT REFERENCES coach_goals(id) ON DELETE SET NULL`;
      console.log("✅ goal_id column added to tracking_items.");
    } catch (e) {
      console.log("⚠️ Migration note: " + e.message);
    }

    console.log("\n🎉 AI Coach database setup complete!");

  } catch (err) {
    console.error("❌ Setup failed:", err);
  } finally {
    await sql.end();
  }
}

setupCoachDB();

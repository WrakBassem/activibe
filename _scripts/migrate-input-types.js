/**
 * migrate-input-types.js
 * Adds input_type column to metrics table and review/score_value columns to daily_entries.
 * 
 * Run: node --experimental-modules _scripts/migrate-input-types.js
 */

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const sql = postgres(env.DIRECT_URL || process.env.DATABASE_URL, {
    ssl: 'require',
    prepare: false
});

async function run() {
    console.log("🔧 Running Input Types Migration...\n");

    // 1. Add input_type to metrics table
    try {
        await sql`ALTER TABLE metrics ADD COLUMN IF NOT EXISTS input_type TEXT DEFAULT 'boolean'`;
        console.log("✅ Added 'input_type' column to metrics table (default: 'boolean')");
    } catch (e) {
        console.log("⚠️ input_type column:", e.message);
    }

    // 2. Add review column to daily_entries table
    try {
        await sql`ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS review TEXT`;
        console.log("✅ Added 'review' column to daily_entries table");
    } catch (e) {
        console.log("⚠️ review column:", e.message);
    }

    // 3. Add score_value column to daily_entries table
    try {
        await sql`ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS score_value INTEGER`;
        console.log("✅ Added 'score_value' column to daily_entries table");
    } catch (e) {
        console.log("⚠️ score_value column:", e.message);
    }

    console.log("\n🎉 Migration complete!");
    process.exit();
}

run();

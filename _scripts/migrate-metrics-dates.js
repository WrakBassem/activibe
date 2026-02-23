import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const sql = postgres(env.DIRECT_URL || env.DATABASE_URL, {
    ssl: 'require',
    prepare: false
});

async function run() {
    console.log("Running migration to add date/time columns to metrics and metric_fields...");

    // 1. Alter metrics table
    await sql`
        ALTER TABLE metrics 
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS end_date DATE,
        ADD COLUMN IF NOT EXISTS duration INTEGER,
        ADD COLUMN IF NOT EXISTS hour TEXT,
        ADD COLUMN IF NOT EXISTS is_custom_date BOOLEAN DEFAULT FALSE
    `;
    console.log("✅ columns added to metrics table");

    // 2. Alter metric_fields table
    await sql`
        ALTER TABLE metric_fields 
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS end_date DATE,
        ADD COLUMN IF NOT EXISTS duration INTEGER,
        ADD COLUMN IF NOT EXISTS hour TEXT,
        ADD COLUMN IF NOT EXISTS is_custom_date BOOLEAN DEFAULT FALSE
    `;
    console.log("✅ columns added to metric_fields table");

    console.log("🎉 Migration complete");
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

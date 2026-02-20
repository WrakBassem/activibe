
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
    console.log("Running sub-metrics DB migration...");

    // 1. metric_fields
    await sql`
        CREATE TABLE IF NOT EXISTS metric_fields (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            metric_id UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            label TEXT,
            field_type TEXT NOT NULL CHECK (field_type IN ('int', 'boolean', 'scale_0_5', 'text')),
            active BOOLEAN DEFAULT TRUE,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `;
    console.log("✅ metric_fields table ready");

    // 2. daily_field_entries
    await sql`
        CREATE TABLE IF NOT EXISTS daily_field_entries (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id TEXT NOT NULL,
            metric_id UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
            field_id UUID NOT NULL REFERENCES metric_fields(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            value_int INTEGER,
            value_bool BOOLEAN,
            value_text TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, field_id, date)
        )
    `;
    console.log("✅ daily_field_entries table ready");

    // 3. Index for faster daily lookups
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_field_entries_user_date ON daily_field_entries(user_id, date)`;
    console.log("✅ Indexes created");

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

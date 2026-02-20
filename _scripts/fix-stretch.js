
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
    // 1. Activate the stretsh metric
    const result = await sql`
        UPDATE metrics SET active = TRUE 
        WHERE name ILIKE '%stretsh%' OR name ILIKE '%stretch%'
        RETURNING id, name, active
    `;
    console.log("Fixed metrics:", result.map(r => `${r.name} -> active: ${r.active}`).join(', '));

    // 2. Add XP columns to users table
    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS titles TEXT[] DEFAULT '{}'`;
        console.log("✅ XP/Level/Titles columns added to users table.");
    } catch (e) {
        console.log("XP columns may already exist:", e.message);
    }

    // 3. Create user_xp_log table for audit trail
    await sql`
        CREATE TABLE IF NOT EXISTS user_xp_log (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id TEXT NOT NULL,
            xp_gained INTEGER NOT NULL,
            reason TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `;
    console.log("✅ user_xp_log table ready.");

    process.exit();
}

run();

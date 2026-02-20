import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
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

const sql = postgres(connectionString, { ssl: 'require' });

async function fixSchema() {
    try {
        console.log("🛠️ Fixing 'daily_scores' schema...");
        
        // 1. Drop the old relation (could be table or view)
        console.log("Dropping old 'daily_scores' relation...");
        try {
            await sql`DROP VIEW IF EXISTS daily_scores CASCADE`;
            console.log("✅ Dropped as VIEW.");
        } catch (e) {
            console.log("Not a view or error:", e.message);
        }

        try {
            await sql`DROP TABLE IF EXISTS daily_scores CASCADE`;
            console.log("✅ Dropped as TABLE.");
        } catch (e) {
             console.log("Not a table or error:", e.message);
        }

        // 2. Re-create correctly
        console.log("Re-creating 'daily_scores'...");
        await sql`
            CREATE TABLE daily_scores (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                date DATE NOT NULL,
                total_score INTEGER DEFAULT 0,
                mode TEXT, 
                burnout_flag BOOLEAN DEFAULT FALSE,
                procrastination_flag BOOLEAN DEFAULT FALSE,
                user_id UUID,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, user_id)
            );
        `;
        console.log("✅ 'daily_scores' re-created with V2 schema.");

    } catch (e) {
        console.error("❌ Fatal Error:", e.message);
    } finally {
        await sql.end();
    }
}

fixSchema();

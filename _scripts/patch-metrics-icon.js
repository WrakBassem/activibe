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

async function patchMetrics() {
    try {
        console.log("🛠️ Adding 'icon' column to 'metrics' table...");
        
        await sql`
            ALTER TABLE metrics 
            ADD COLUMN IF NOT EXISTS icon TEXT;
        `;
        
        console.log("✅ 'icon' column added successfully.");

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await sql.end();
    }
}

patchMetrics();

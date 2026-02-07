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

const sql = postgres(connectionString, {
  ssl: 'require',
});

async function check() {
  try {
    console.log("🔍 Checking daily_logs...");
    const logs = await sql`SELECT * FROM daily_logs ORDER BY log_date DESC`;
    if (logs.length === 0) {
      console.log("❌ No logs found.");
    } else {
      console.log(`✅ Found ${logs.length} logs:`);
      logs.forEach(l => console.log(`- ${l.log_date} (ID: ${l.id})`));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

check();

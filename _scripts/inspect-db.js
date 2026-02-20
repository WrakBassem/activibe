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

async function inspect() {
    try {
        console.log('--- daily_scores columns ---');
        const scoresCols = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'daily_scores';
        `;
        console.log(JSON.stringify(scoresCols, null, 2));

        console.log('\n--- daily_entries columns ---');
        const entriesCols = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'daily_entries';
        `;
        console.log(JSON.stringify(entriesCols, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await sql.end();
    }
}

inspect();


import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const sql = postgres(env.DIRECT_URL || process.env.DATABASE_URL);

async function inspectEntries() {
    console.log("--- Checking Constraints ---");
    // Check for unique index on daily_entries
    const indices = await sql`
        SELECT indexname FROM pg_indexes WHERE tablename = 'daily_entries';
    `;
    console.log("Indices:", indices.map(i => i.indexname).join(", "));

    console.log("\n--- Checking Today's Entries ---");
    const today = new Date().toISOString().split('T')[0];
    
    // Get entries for today
    const entries = await sql`
        SELECT metric_id, completed, score_awarded 
        FROM daily_entries 
        WHERE date = ${today}
    `;
    
    console.log(`Found ${entries.length} entries for ${today}`);
    
    // Check for duplicates
    const metricCounts = {};
    for (const e of entries) {
        metricCounts[e.metric_id] = (metricCounts[e.metric_id] || 0) + 1;
    }
    
    const duplicates = Object.entries(metricCounts).filter(([id, count]) => count > 1);
    
    if (duplicates.length > 0) {
        console.log("⚠️ DUPLICATES FOUND:");
        for (const [id, count] of duplicates) {
            console.log(`Metric ${id}: ${count} entries`);
            const dupRows = await sql`SELECT * FROM daily_entries WHERE date = ${today} AND metric_id = ${id}`;
            console.log(JSON.stringify(dupRows, null, 2));
        }
    } else {
        console.log("✅ No duplicates found.");
    }

    process.exit();
}

inspectEntries();

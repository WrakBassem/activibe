
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

const sql = postgres(env.DIRECT_URL || process.env.DATABASE_URL, {
    ssl: 'require',
    prepare: false
});

async function debugMetric() {
    console.log("--- DEBUGGING METRIC 'stretsh' ---");
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Find the metric (fuzzy search)
    const metrics = await sql`
        SELECT * FROM metrics 
        WHERE name ILIKE '%stretsh%' OR name ILIKE '%stretch%'
    `;
    
    let output = "--- DEBUGGING METRIC 'stretsh' ---\n";

    if (metrics.length === 0) {
        output += "❌ Metric not found!\n";
    } else {
        output += "Found Metric(s):\n";
        for (const m of metrics) {
             output += `ID: ${m.id} | Name: ${m.name} | Active: ${m.active} | Axis: ${m.axis_id}\n`;
             // Check Axis Active Status
             const axis = await sql`SELECT name, active FROM axes WHERE id = ${m.axis_id}`;
             if (axis.length > 0) {
                 output += `\t-> Parent Axis: ${axis[0].name} | Active: ${axis[0].active}\n`;
             } else {
                 output += `\t-> ❌ Parent Axis not found!\n`;
             }
        }

        // 2. Check entries for these metrics today
        const metricIds = metrics.map(m => m.id);
        if (metricIds.length > 0) {
            const entries = await sql`
                SELECT * FROM daily_entries 
                WHERE date = ${today} AND metric_id IN ${sql(metricIds)}
            `;
            output += `\nEntries for today (${today}):\n`;
            if (entries.length === 0) output += "No entries found for these metrics.\n";
            else output += JSON.stringify(entries, null, 2);
        }
    }
    
    fs.writeFileSync('_scripts/debug-metric.log', output);
    console.log("Output written to _scripts/debug-metric.log");
    process.exit();
}

debugMetric();

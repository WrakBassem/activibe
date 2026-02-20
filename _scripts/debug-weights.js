
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

const connectionString = env.DIRECT_URL || process.env.DATABASE_URL;
const sql = postgres(connectionString);

async function debugWeights() {
    console.log("--- Active Cycle ---");
    const today = new Date().toISOString().split('T')[0];
    const cycles = await sql`SELECT * FROM priority_cycles WHERE start_date <= ${today} AND end_date >= ${today}`;
    console.log(JSON.stringify(cycles, null, 2));

    if (cycles.length > 0) {
        console.log("\n--- Axis Weights for Cycle ---");
        const weights = await sql`SELECT * FROM axis_weights WHERE cycle_id = ${cycles[0].id}`;
        console.log(JSON.stringify(weights, null, 2));
        
        const totalWeight = weights.reduce((sum, w) => sum + w.weight_percentage, 0);
        console.log("\nTotal Weight Sum:", totalWeight);
    } else {
        console.log("⚠️ No active cycle found for today!");
    }

    console.log("\n--- Active Metrics & Axes ---");
    const axes = await sql`SELECT * FROM axes WHERE active = TRUE`;
    
    for (const axis of axes) {
        const metrics = await sql`SELECT name, max_points FROM metrics WHERE axis_id = ${axis.id} AND active = TRUE`;
        console.log(`Axis: ${axis.name} (ID: ${axis.id})`);
        console.log(JSON.stringify(metrics, null, 2));
    }
    
    process.exit();
}

debugWeights();

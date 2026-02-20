
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

async function fixWeights() {
    console.log("--- FIXING WEIGHTS ---");
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Get Active Cycle
    const cycles = await sql`SELECT id, name FROM priority_cycles WHERE start_date <= ${today} AND end_date >= ${today} LIMIT 1`;
    if (cycles.length === 0) {
        console.log("No active cycle found. Cannot fix weights.");
        process.exit();
    }
    const cycle = cycles[0];
    console.log(`Active Cycle: ${cycle.name}`);

    // 2. Get Active Axes
    const axes = await sql`SELECT id, name FROM axes WHERE active = TRUE`;
    if (axes.length === 0) {
        console.log("No active axes found.");
        process.exit();
    }
    console.log(`Found ${axes.length} active axes.`);

    // 3. Reset Weights to Equal Distribution
    const equalWeight = Math.floor(100 / axes.length);
    const remainder = 100 % axes.length;
    
    console.log(`Setting weights to ~${equalWeight}% per axis...`);
    
    await sql.begin(async sql => {
        // Clear existing weights for this cycle
        await sql`DELETE FROM axis_weights WHERE cycle_id = ${cycle.id}`;
        
        // Insert new weights
        for (let i = 0; i < axes.length; i++) {
            const axis = axes[i];
            // Add remainder to first axis to ensure sum is exactly 100
            const weight = i === 0 ? equalWeight + remainder : equalWeight;
            
            await sql`
                INSERT INTO axis_weights (cycle_id, axis_id, weight_percentage)
                VALUES (${cycle.id}, ${axis.id}, ${weight})
            `;
            console.log(`Set ${axis.name}: ${weight}%`);
        }
    });

    console.log("\n✅ Weights repaired successfully!");
    process.exit();
}

fixWeights();

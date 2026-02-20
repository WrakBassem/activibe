
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

async function testScore() {
    console.log("--- Simulating Scoring Logic ---");
    
    // 1. Get User
    const users = await sql`SELECT id, email FROM users LIMIT 1`;
    if (users.length === 0) { console.log('No users found'); process.exit(); }
    const user = users[0];
    console.log(`User: ${user.email} (${user.id})`);

    const logDate = new Date().toISOString().split('T')[0];
    console.log(`Date: ${logDate}`);

    // 2. Active Cycle
    const cycles = await sql`SELECT id, name FROM priority_cycles WHERE start_date <= ${logDate} AND end_date >= ${logDate} LIMIT 1`;
    let activeWeights = [];
    if (cycles.length > 0) {
        console.log(`Active Cycle: ${cycles[0].name} (${cycles[0].id})`);
        activeWeights = await sql`SELECT axis_id, weight_percentage FROM axis_weights WHERE cycle_id = ${cycles[0].id}`;
        console.log("Weights:", JSON.stringify(activeWeights));
        
        const totalWeight = activeWeights.reduce((sum, w) => sum + w.weight_percentage, 0);
        console.log(`Total Configured Weight: ${totalWeight}%`);
    } else {
        console.log("⚠️ No active cycle found.");
    }

    // 3. Metrics & Axes
    const metrics = await sql`SELECT id, name, axis_id, max_points FROM metrics WHERE active = TRUE`;
    const allAxes = await sql`SELECT id, name FROM axes WHERE active = TRUE`;
    
    // 4. Score Calculation
    const axisScores = {};
    for (const axis of allAxes) {
        // Find weight for this axis
        // CAUTION: Ensure type matching for ID
        const wObj = activeWeights.find(aw => aw.axis_id === axis.id);
        const w = wObj ? wObj.weight_percentage : 0;
        
        axisScores[axis.id] = { name: axis.name, raw: 0, max: 0, weight: w };
    }

    // Calculate Max & Simulate 100% Completion
    for (const m of metrics) {
        if (axisScores[m.axis_id]) {
            axisScores[m.axis_id].max += m.max_points; // Max possible for axis
            axisScores[m.axis_id].raw += m.max_points; // Simulate achieving it
        }
    }

    console.log("\n--- AXIS CONFIGURATION ---");
    let calculatedMax = 0;
    for (const axisId in axisScores) {
        const s = axisScores[axisId];
        console.log(`Axis: ${s.name.padEnd(15)} | Weight: ${s.weight}% | Max Pts: ${s.max}`);
        if (s.max > 0 && s.weight > 0) {
            calculatedMax += (1 * s.weight); // 1.0 ratio * weight
        }
    }
    
    console.log(`\nTHEORETICAL MAX SCORE: ${Math.round(calculatedMax)}`);
    
    if (calculatedMax < 100) {
        console.log("⚠️ WARNING: Total achievable score is less than 100. Check weights!");
    }
    process.exit();
}

testScore();

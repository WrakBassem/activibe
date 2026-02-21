/**
 * fix-xp.js
 * Recalculates XP for all users based on their actual unique daily_scores entries.
 * This fixes inflated XP from duplicate awards on re-submissions.
 * 
 * Run: node --experimental-modules _scripts/fix-xp.js
 */

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

const XP_PER_LOG = 10;
const XP_PER_PERFECT_SCORE = 50;

function getLevelFromXP(xp) {
    const getLevelThreshold = (level) => level * level * 75;
    let level = 1;
    while (xp >= getLevelThreshold(level + 1)) {
        level++;
        if (level >= 100) break;
    }
    return level;
}

async function run() {
    console.log("🔧 Recalculating XP for all users...\n");

    // Get all users
    const users = await sql`SELECT id, xp, level FROM users`;
    
    for (const user of users) {
        // Count unique daily logs
        const dailyLogs = await sql`
            SELECT COUNT(DISTINCT date) as total_logs FROM daily_scores WHERE user_id = ${user.id}
        `;
        const totalLogs = Number(dailyLogs[0]?.total_logs || 0);

        // Count perfect days (score = 100)
        const perfectDays = await sql`
            SELECT COUNT(*) as count FROM daily_scores 
            WHERE user_id = ${user.id} AND total_score = 100
        `;
        const totalPerfect = Number(perfectDays[0]?.count || 0);

        // Calculate correct XP
        const correctXP = (totalLogs * XP_PER_LOG) + (totalPerfect * XP_PER_PERFECT_SCORE);
        const correctLevel = getLevelFromXP(correctXP);

        console.log(`User: ${user.id}`);
        console.log(`  Old XP: ${user.xp}, Old Level: ${user.level}`);
        console.log(`  Unique logs: ${totalLogs}, Perfect days: ${totalPerfect}`);
        console.log(`  Correct XP: ${correctXP}, Correct Level: ${correctLevel}`);
        
        if (user.xp !== correctXP) {
            await sql`
                UPDATE users SET xp = ${correctXP}, level = ${correctLevel}
                WHERE id = ${user.id}
            `;
            console.log(`  ✅ FIXED: ${user.xp} → ${correctXP} XP\n`);

            // Clean up old XP log entries and recreate clean ones
            await sql`DELETE FROM user_xp_log WHERE user_id = ${user.id}`;
            
            // Get all log dates for this user to recreate clean XP log
            const logDates = await sql`
                SELECT date, total_score FROM daily_scores 
                WHERE user_id = ${user.id} ORDER BY date ASC
            `;
            for (const log of logDates) {
                const dateStr = log.date instanceof Date 
                    ? log.date.toISOString().split('T')[0] 
                    : String(log.date);
                const isPerfect = Number(log.total_score) === 100;
                const xp = XP_PER_LOG + (isPerfect ? XP_PER_PERFECT_SCORE : 0);
                const reason = isPerfect ? `daily_log:${dateStr}:perfect` : `daily_log:${dateStr}`;
                await sql`
                    INSERT INTO user_xp_log (user_id, xp_gained, reason) 
                    VALUES (${user.id}, ${xp}, ${reason})
                `;
            }
            console.log(`  📝 Recreated ${logDates.length} clean XP log entries\n`);
        } else {
            console.log(`  ✨ Already correct\n`);
        }
    }

    console.log("✅ XP recalculation complete!");
    process.exit();
}

run();

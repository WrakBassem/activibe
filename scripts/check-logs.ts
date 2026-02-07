import sql from '../lib/db';

async function checkLogs() {
  try {
    console.log("🔍 Checking daily_logs table...");
    
    // Get all logs
    const logs = await sql`SELECT * FROM daily_logs ORDER BY log_date DESC`;
    
    console.log(`Found ${logs.length} logs:`);
    logs.forEach(log => {
      console.log(`- Date: ${log.log_date}, ID: ${log.id}`);
    });

    if (logs.length === 0) {
      console.log("❌ No logs found! Database is empty.");
    }

    // Check specifically for today
    const today = new Date().toISOString().split('T')[0];
    const todayLog = await sql`SELECT * FROM daily_logs WHERE log_date = ${today}`;
    
    console.log(`\n📅 Checking for today (${today}):`);
    if (todayLog.length > 0) {
      console.log("✅ Log exists for today.");
    } else {
      console.log("❌ No log found for today.");
    }

  } catch (err: any) {
    console.error("❌ Error checking logs:", err);
  } finally {
    process.exit();
  }
}

checkLogs();

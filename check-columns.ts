import 'dotenv/config';
import sql from './lib/db';

async function checkColumns() {
  const tables = ['tracking_items', 'daily_item_logs', 'daily_logs', 'daily_final_score', 'users'];
  
  try {
    for (const table of tables) {
      console.log(`\n--- ${table} ---`);
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table}
      `;
      console.table(columns);
    }
  } catch (error) {
    console.error('Error checking columns:', error);
  } finally {
    process.exit();
  }
}

checkColumns();

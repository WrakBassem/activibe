import 'dotenv/config';
import postgres from 'postgres';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');

if (!connectionString) {
  console.error('No connection string found');
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: 'require' });

async function checkOwnership() {
  try {
    const currentUser = await sql`SELECT current_user`;
    console.log('Current User:', currentUser[0].current_user);

    const tables = ['tracking_items', 'daily_logs', 'daily_item_logs', 'daily_final_score'];
    for (const table of tables) {
      const owner = await sql`
        SELECT tableowner 
        FROM pg_tables 
        WHERE tablename = ${table}
      `;
      if (owner.length > 0) {
        console.log(`Table ${table} owner:`, owner[0].tableowner);
      } else {
        console.log(`Table ${table} not found in pg_tables.`);
      }
    }
  } catch (error) {
    console.error('Error checking ownership:', error);
  } finally {
    await sql.end();
  }
}

checkOwnership();

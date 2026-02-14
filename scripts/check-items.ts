import 'dotenv/config';
import postgres from 'postgres';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');
const sql = postgres(connectionString!, { ssl: 'require' });

async function check() {
  try {
    const constraints = await sql`
      SELECT conname, contype, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'daily_item_logs'::regclass AND contype IN ('u', 'p')
    `;
    console.log('UNIQUE/PRIMARY constraints on daily_item_logs:');
    if (constraints.length === 0) console.log('  NONE FOUND - THIS IS THE BUG');
    constraints.forEach(c => console.log('  ' + c.conname + ': ' + c.def));

    console.log('');
    const logs = await sql`SELECT * FROM daily_item_logs ORDER BY log_date DESC LIMIT 3`;
    console.log('Recent daily_item_logs count:', logs.length);
    logs.forEach(l => console.log('  ' + l.log_date + ' item=' + l.item_id + ' done=' + l.completed));
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await sql.end();
  }
}
check();

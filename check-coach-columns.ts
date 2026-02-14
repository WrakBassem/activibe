import 'dotenv/config';
import postgres from 'postgres';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');
const sql = postgres(connectionString!, { ssl: 'require' });

async function checkCoachTables() {
  const tables = ['user_profile', 'coach_goals', 'coach_sessions'];
  for (const table of tables) {
    console.log(`\n--- ${table} ---`);
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = ${table}
    `;
    columns.forEach(c => console.log(`${c.column_name} (${c.data_type})`));
  }
  await sql.end();
}

checkCoachTables();

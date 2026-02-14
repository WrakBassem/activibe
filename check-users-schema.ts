import 'dotenv/config';
import postgres from 'postgres';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');
const sql = postgres(connectionString!, { ssl: 'require' });

async function checkUsersTable() {
  console.log(`\n--- users ---`);
  const columns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users'
  `;
  columns.forEach(c => console.log(`${c.column_name} (${c.data_type})`));
  await sql.end();
}

checkUsersTable();

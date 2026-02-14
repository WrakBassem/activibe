import 'dotenv/config';
import postgres from 'postgres';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');

if (!connectionString) {
  console.error('No connection string found');
  process.exit(1);
}

console.log('Testing connection to:', connectionString.replace(/:[^:@]+@/, ':****@')); // Mask password

const sql = postgres(connectionString, {
  ssl: 'require',
});

async function testConnection() {
  try {
    const version = await sql`SELECT version()`;
    console.log('Connection successful:', version[0].version);
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await sql.end();
  }
}

testConnection();

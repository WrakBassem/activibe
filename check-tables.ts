import sql from './lib/db';

async function checkTables() {
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    console.log('Existing tables:', tables);
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    process.exit();
  }
}

checkTables();

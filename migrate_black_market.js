require('dotenv').config({ path: '.env' });
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL or DIRECT_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: 'require',
  prepare: false, 
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'black_market_migration.sql');
    const queries = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running Black Market Migration...');
    await sql.unsafe(queries);
    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();

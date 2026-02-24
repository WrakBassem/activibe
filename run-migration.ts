import sql from './lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(process.cwd(), 'achievements_migration.sql');
    const sqlString = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration...');
    await sql.unsafe(sqlString);
    
    console.log('Achievements migration applied successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    process.exit();
  }
}

runMigration();

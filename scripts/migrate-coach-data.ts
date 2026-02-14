import 'dotenv/config';
import postgres from 'postgres';
import { hash } from 'bcrypt';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');
if (!connectionString) process.exit(1);

const sql = postgres(connectionString, { ssl: 'require' });

const TARGET_EMAIL = 'ourakbassem6@gmail.com';

async function migrateCoachData() {
  try {
    console.log(`Starting coach data migration for: ${TARGET_EMAIL}`);

    const users = await sql`SELECT id FROM users WHERE email = ${TARGET_EMAIL}`;
    if (users.length === 0) {
      console.error('User not found! Run partial migration first.');
      process.exit(1);
    }
    const userId = users[0].id;
    console.log(`User ID: ${userId}`);

    const tables = ['user_profile', 'coach_goals', 'coach_sessions'];

    for (const table of tables) {
      console.log(`\nProcessing table: ${table}`);

      // Check if column exists
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table} AND column_name = 'user_id'
      `;

      if (columns.length === 0) {
        console.log(`Adding user_id column...`);
        await sql`ALTER TABLE ${sql(table)} ADD COLUMN user_id UUID`;
      } else {
        console.log(`user_id column already exists.`);
      }

      // Update records
      console.log(`Assigning orphaned records...`);
      const updateResult = await sql`
        UPDATE ${sql(table)} 
        SET user_id = ${userId} 
        WHERE user_id IS NULL
      `;
      console.log(`Updated ${updateResult.count} records.`);

      // Add constraints
      try {
        console.log(`Adding constraints...`);
        await sql`
            ALTER TABLE ${sql(table)} 
            ALTER COLUMN user_id SET NOT NULL,
            DROP CONSTRAINT IF EXISTS ${sql(`${table}_user_id_fkey`)},
            ADD CONSTRAINT ${sql(`${table}_user_id_fkey`)} 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        `;
        console.log(`Constraints added.`);
      } catch (err: any) {
        console.error(`Error adding constraints to ${table}: ${err.message}`);
      }
    }

    console.log('\nCoach data migration completed.');

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await sql.end();
  }
}

migrateCoachData();

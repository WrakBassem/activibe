import 'dotenv/config';
import postgres from 'postgres';
import { hash } from 'bcrypt';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');

if (!connectionString) {
  console.error('DATABASE_URL or DIRECT_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: 'require',
});

const TARGET_EMAIL = 'ourakbassem6@gmail.com';
const TARGET_NAME = 'Bassem'; // Default name if we need to create
const DEFAULT_PASSWORD = 'password123'; // Temporary password if we create the user

async function migrate() {
  try {
    console.log(`Starting migration for target user: ${TARGET_EMAIL}`);

    // 1. Get or Create User
    let users = await sql`SELECT id FROM users WHERE email = ${TARGET_EMAIL}`;
    let userId;

    if (users.length === 0) {
      console.log('User not found. Creating user...');
      const passwordHash = await hash(DEFAULT_PASSWORD, 10);
      users = await sql`
        INSERT INTO users (email, password_hash, name)
        VALUES (${TARGET_EMAIL}, ${passwordHash}, ${TARGET_NAME})
        RETURNING id
      `;
      console.log(`User created with ID: ${users[0].id}`);
      console.log(`Temporary password: ${DEFAULT_PASSWORD}`);
    } else {
      console.log(`User found with ID: ${users[0].id}`);
    }
    userId = users[0].id;

    // 2. Add user_id column and migrate data for each table
    const tables = ['tracking_items', 'daily_logs', 'daily_item_logs', 'daily_final_score'];

    for (const table of tables) {
      console.log(`\nProcessing table: ${table}`);

      // Check if column exists
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table} AND column_name = 'user_id'
      `;

      if (columns.length === 0) {
        console.log(`Adding user_id column to ${table}...`);
        await sql`ALTER TABLE ${sql(table)} ADD COLUMN user_id UUID`;
      } else {
        console.log(`user_id column already exists in ${table}.`);
      }

      // Update records
      console.log(`Assigning orphaned records to user...`);
      const updateResult = await sql`
        UPDATE ${sql(table)} 
        SET user_id = ${userId} 
        WHERE user_id IS NULL
      `;
      console.log(`Updated ${updateResult.count} records.`);

      // Add constraints (ForeignKey and Not Null)
      // Note: We do this in a separate block to ensure data is fixed first
      try {
        console.log(`Adding constraints to ${table}...`);
        await sql`
            ALTER TABLE ${sql(table)} 
            ALTER COLUMN user_id SET NOT NULL,
            DROP CONSTRAINT IF EXISTS ${sql(`${table}_user_id_fkey`)},
            ADD CONSTRAINT ${sql(`${table}_user_id_fkey`)} 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        `;
        console.log(`Constraints added successfully.`);
      } catch (err: any) {
        console.error(`Error adding constraints to ${table}: ${err.message}`);
      }
    }

    console.log('\nMigration completed successfully.');

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await sql.end();
  }
}

migrate();

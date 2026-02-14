import 'dotenv/config';
import postgres from 'postgres';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL or DIRECT_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: 'require',
});

async function setupUsersTable() {
  try {
    console.log('Creating users table if it does not exist...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Users table created successfully.');
  } catch (error) {
    console.error('Error creating users table:', error);
  } finally {
    await sql.end();
  }
}

setupUsersTable();

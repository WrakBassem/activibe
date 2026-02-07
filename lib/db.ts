import postgres from 'postgres'

// Use DIRECT_URL from .env for Supabase connection
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL environment variable is required')
}

// Supabase requires SSL
const sql = postgres(connectionString, {
  ssl: 'require',
})

export default sql

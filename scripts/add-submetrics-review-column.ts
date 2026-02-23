import 'dotenv/config'
import sql from '../lib/db'

async function addSubmetricsReviewColumn() {
  try {
    console.log('Adding review column to daily_field_entries table...')
    await sql`ALTER TABLE daily_field_entries ADD COLUMN IF NOT EXISTS review TEXT;`
    console.log('Successfully added review column.')
  } catch (error) {
    console.error('Error adding column:', error)
  } finally {
    process.exit(0)
  }
}

addSubmetricsReviewColumn()

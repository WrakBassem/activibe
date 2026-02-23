require('dotenv').config()
const postgres = require('postgres')

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432')
const sql = postgres(connectionString, { ssl: 'require' })

async function migrate() {
  try {
    console.log('Creating ai_insights table...')

    await sql`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id          SERIAL PRIMARY KEY,
        user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        report_type VARCHAR(10) NOT NULL CHECK (report_type IN ('daily', 'weekly')),
        report_date DATE NOT NULL,
        tips        JSONB NOT NULL DEFAULT '[]',
        strategies  JSONB NOT NULL DEFAULT '[]',
        focus_areas JSONB NOT NULL DEFAULT '[]',
        raw_text    TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, report_type, report_date)
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS ai_insights_user_date_idx
      ON ai_insights (user_id, report_type, report_date DESC)
    `

    console.log('✅ ai_insights table created successfully!')
    console.log('Schema:')
    console.log('  - id: SERIAL PRIMARY KEY')
    console.log('  - user_id: UUID (references auth.users)')
    console.log('  - report_type: "daily" | "weekly"')
    console.log('  - report_date: DATE (the day/week-start the report covers)')
    console.log('  - tips: JSONB array of strings')
    console.log('  - strategies: JSONB array of strings')
    console.log('  - focus_areas: JSONB array of { area, reason }')
    console.log('  - raw_text: TEXT (full markdown for reference)')
    console.log('  - created_at: TIMESTAMPTZ')
    console.log('  - UNIQUE(user_id, report_type, report_date)')

  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

migrate()

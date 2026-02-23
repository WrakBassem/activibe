require('dotenv').config()
const postgres = require('postgres')

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432')
const sql = postgres(connectionString, { ssl: 'require' })

async function fix() {
  try {
    console.log('Dropping FK constraint...')
    await sql`ALTER TABLE ai_insights DROP CONSTRAINT IF EXISTS ai_insights_user_id_fkey`
    console.log('✅ Dropped ai_insights_user_id_fkey constraint')

    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ai_insights'
      ORDER BY ordinal_position
    `
    console.log('Table columns:', cols.map(c => `${c.column_name} (${c.data_type})`).join(', '))
    console.log('✅ ai_insights.user_id is now a plain UUID (no FK constraint)')
  } catch (e) {
    console.error('❌ Error:', e.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

fix()

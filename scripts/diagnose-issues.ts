import 'dotenv/config';
import postgres from 'postgres';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');
const sql = postgres(connectionString!, { ssl: 'require' });

async function diagnose() {
  try {
    // 1. Check unique constraints on daily_logs
    console.log('--- daily_logs CONSTRAINTS ---');
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'daily_logs'::regclass AND contype = 'u'
    `;
    if (constraints.length === 0) console.log('  NO UNIQUE constraints found!');
    constraints.forEach(c => console.log(`  ${c.conname}: ${c.def}`));

    // 2. Check frequency_days column type
    console.log('\n--- frequency_days TYPE ---');
    const colType = await sql`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'tracking_items' AND column_name = 'frequency_days'
    `;
    console.log(`  ${colType[0]?.data_type} (${colType[0]?.udt_name})`);

    // 3. Sample frequency_days
    console.log('\n--- Sample frequency_days ---');
    const samples = await sql`SELECT id, title, frequency_days FROM tracking_items LIMIT 3`;
    samples.forEach(s => console.log(`  [${s.id}] ${s.title}: ${JSON.stringify(s.frequency_days)} (JS type: ${typeof s.frequency_days})`));

    // 4. Check if daily_final_score view includes user_id
    console.log('\n--- daily_final_score VIEW has user_id? ---');
    const viewCols = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'daily_final_score'
      ORDER BY ordinal_position
    `;
    console.log('  Columns:', viewCols.map(c => c.column_name).join(', '));

    // 5. Check daily_scores view columns
    console.log('\n--- daily_scores VIEW has user_id? ---');
    const scoreCols = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'daily_scores'
      ORDER BY ordinal_position
    `;
    console.log('  Columns:', scoreCols.map(c => c.column_name).join(', '));

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await sql.end();
  }
}

diagnose();

import 'dotenv/config';
import postgres from 'postgres';
import fs from 'fs';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');
const sql = postgres(connectionString!, { ssl: 'require' });

async function saveDefs() {
  try {
    const scoresDef = await sql`SELECT pg_get_viewdef('daily_scores'::regclass, true) as def`;
    const finalDef = await sql`SELECT pg_get_viewdef('daily_final_score'::regclass, true) as def`;

    fs.writeFileSync('daily_scores.sql', scoresDef[0].def);
    fs.writeFileSync('daily_final_score.sql', finalDef[0].def);
    
    console.log('Definitions saved.');
  } catch (error) {
    console.error(error);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

saveDefs();

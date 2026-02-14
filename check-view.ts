import 'dotenv/config';
import postgres from 'postgres';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');

if (!connectionString) {
  console.error('No connection string found');
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: 'require' });

async function checkView() {
  try {
    const views = ['daily_scores', 'daily_final_score'];
    for (const viewName of views) {
        console.log(`--- VIEW: ${viewName} ---`);
        const definition = await sql`
        SELECT pg_get_viewdef(${viewName}::regclass, true) as def
        `;
        
        if (definition.length > 0) {
        console.log(definition[0].def);
        } else {
        console.log(`View ${viewName} not found or empty definition.`);
        }
    }
  } catch (error) {
    console.error('Error checking view:', error);
  } finally {
    await sql.end();
  }
}

checkView();

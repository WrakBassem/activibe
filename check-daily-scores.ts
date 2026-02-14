import 'dotenv/config';
import postgres from 'postgres';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');

if (!connectionString) {
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: 'require' });

async function checkDailyScores() {
  try {
    // Check if table
    const table = await sql`
        SELECT tableowner 
        FROM pg_tables 
        WHERE tablename = 'daily_scores'
    `;
    
    if (table.length > 0) {
        console.log('daily_scores is a TABLE.');
    } else {
        // Check if view
        const view = await sql`
            SELECT viewowner 
            FROM pg_views 
            WHERE viewname = 'daily_scores'
        `;
        if (view.length > 0) {
            console.log('daily_scores is a VIEW.');
            const def = await sql`SELECT pg_get_viewdef('daily_scores'::regclass, true) as def`;
            console.log('Definition:', def[0].def);
        } else {
            console.log('daily_scores NOT FOUND.');
        }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkDailyScores();

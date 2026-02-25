import fs from 'fs';
import { neon } from '@neondatabase/serverless';

async function migrate() {
    const env = fs.readFileSync('.env.local', 'utf8');
    const match = env.match(/DATABASE_URL=(.+)/);
    if (match) {
        const db = neon(match[1]);
        const sql = fs.readFileSync('push_migration.sql', 'utf8');
        console.log('Running migration...');
        await db(sql);
        console.log('Migration OK');
    }
}
migrate().catch(console.error);

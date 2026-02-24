import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'bosses_migration.sql');
        const query = fs.readFileSync(filePath, 'utf8');
        
        // Execute the raw query
        await sql.unsafe(query);
        
        return NextResponse.json({ success: true, message: "Migration applied successfully!" });
    } catch (e: any) {
        console.error("Migration failed:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

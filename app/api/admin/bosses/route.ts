import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-utils';
import { ensureAdmin } from '@/lib/admin-utils';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureAdmin(userId);

    const bosses = await sql`
        SELECT ab.id as encounter_id, ab.current_health, b.max_health, 
               (ab.defeated_at IS NULL) as is_active, 
               b.name, b.description, b.image_url, u.email as user_email
        FROM active_bosses ab
        JOIN bosses b ON ab.boss_id = b.id
        JOIN users u ON ab.user_id = u.id
        WHERE ab.defeated_at IS NULL
        ORDER BY ab.spawned_at DESC
    `;

    return NextResponse.json({ success: true, data: bosses });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[GET /api/admin/bosses] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const userId = await getAuthUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await ensureAdmin(userId);

        const body = await request.json();
        const { encounter_id, current_health, is_active } = body;

        if (!encounter_id) return NextResponse.json({ error: 'Missing encounter_id' }, { status: 400 });

        await sql`
            UPDATE active_bosses 
            SET current_health = ${current_health},
                defeated_at = ${is_active ? null : new Date()}
            WHERE id = ${encounter_id}
        `;

        return NextResponse.json({ success: true, message: `Boss encounter ${encounter_id} updated` });
    } catch (error: any) {
        if (error.message.includes('Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        console.error('[POST /api/admin/bosses] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-utils';
import { ensureAdmin } from '@/lib/admin-utils';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    await ensureAdmin(userId);

    const users = await sql`
      SELECT id, email, role, level, xp, gold, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/admin/users] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const userId = await getAuthUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await ensureAdmin(userId);

        const body = await request.json();
        const { targetUserId, newRole } = body;

        if (!targetUserId || !newRole) {
            return NextResponse.json({ error: 'Missing targetUserId or newRole' }, { status: 400 });
        }

        await sql`
            UPDATE users SET role = ${newRole} WHERE id = ${targetUserId}
        `;

        return NextResponse.json({ success: true, message: `User role updated to ${newRole}` });
    } catch (error: any) {
        if (error.message.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[POST /api/admin/users] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

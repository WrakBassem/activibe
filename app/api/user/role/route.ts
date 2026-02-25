import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-utils';
import { isAdmin } from '@/lib/admin-utils';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ role: 'guest', isAdmin: false }, { status: 401 });
    }

    const users = await sql`SELECT role FROM users WHERE id = ${userId}`;
    if (users.length === 0) {
      return NextResponse.json({ role: 'guest', isAdmin: false }, { status: 404 });
    }

    const role = users[0].role || 'user';

    return NextResponse.json({
      success: true,
      role: role,
      isAdmin: role === 'admin'
    });
  } catch (error: any) {
    console.error('[GET /api/user/role] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch user role' }, { status: 500 });
  }
}

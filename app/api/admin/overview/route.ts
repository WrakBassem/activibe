import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-utils';
import { ensureAdmin } from '@/lib/admin-utils';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureAdmin(userId);

    // 1. Total Users
    const usersCountResult = await sql`SELECT COUNT(*)::int as count FROM users`;
    const totalUsers = usersCountResult[0]?.count || 0;

    // 2. Total Gold in Circulation
    const goldResult = await sql`SELECT SUM(gold)::int as total_gold FROM users`;
    const totalGold = goldResult[0]?.total_gold || 0;

    // 3. Active Boss Encounters
    const bossesResult = await sql`SELECT COUNT(*)::int as count FROM active_bosses WHERE defeated_at IS NULL`;
    const activeBosses = bossesResult[0]?.count || 0;

    // 4. Active Smuggler Events
    const smugglersResult = await sql`SELECT COUNT(*)::int as count FROM smuggler_events WHERE expires_at > CURRENT_TIMESTAMP`;
    const activeSmugglers = smugglersResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalGold,
        activeBosses,
        activeSmugglers
      }
    });

  } catch (error: any) {
    if (error.message.includes('Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[GET /api/admin/overview] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

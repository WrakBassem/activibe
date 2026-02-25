import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-utils';
import { ensureAdmin } from '@/lib/admin-utils';
import { awardXP, awardGold } from '@/lib/gamification';

export async function POST(request: Request) {
    try {
        const userId = await getAuthUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await ensureAdmin(userId);

        const body = await request.json();
        const { targetUserId, rewardType, amount } = body;

        if (!targetUserId || !rewardType || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid input. Provide targetUserId, rewardType (gold or xp), and amount > 0' }, { status: 400 });
        }

        if (rewardType === 'gold') {
            await awardGold(targetUserId, amount);
        } else if (rewardType === 'xp') {
            await awardXP(targetUserId, 'admin_grant', amount);
        } else {
            return NextResponse.json({ error: 'Invalid rewardType. Use "gold" or "xp"' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: `Successfully granted ${amount} ${rewardType.toUpperCase()} to user.` });

    } catch (error: any) {
        if (error.message.includes('Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        console.error('[POST /api/admin/users/grant] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

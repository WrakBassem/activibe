import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-utils';

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await request.json();
    
    // Validate subscription payload
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    // Insert or update subscription
    await sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (
        ${userId}, 
        ${subscription.endpoint}, 
        ${subscription.keys.p256dh}, 
        ${subscription.keys.auth}
      )
      ON CONFLICT (user_id, endpoint) 
      DO UPDATE SET last_used_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({ success: true, message: 'Subscription saved' });
  } catch (error: any) {
    console.error('[POST /api/notifications/subscribe]', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

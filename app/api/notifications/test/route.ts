import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-utils';
import { sendNotification } from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = {
      title: '🚨 Enemy Approaching!',
      body: 'The Burnout Behemoth is charging its attack! Log your day before Midnight to raise your shields.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: {
        url: '/'
      }
    };

    const result = await sendNotification(userId, payload);
    
    if (result.success && (result.count ?? 0) > 0) {
      return NextResponse.json({ success: true, message: `Notification sent to ${result.count} devices.` });
    } else {
      return NextResponse.json({ success: false, message: 'No valid subscriptions found.' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('[POST /api/notifications/test]', error);
    return NextResponse.json({ error: 'Failed to send test notification' }, { status: 500 });
  }
}

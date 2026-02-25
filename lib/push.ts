import webpush from 'web-push';
import sql from '@/lib/db';

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.NEXT_PRIVATE_VAPID_PRIVATE_KEY || '',
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:support@activibe.app',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  } catch (e) {
    console.warn('VAPID details could not be set:', e);
  }
}

export async function sendNotification(userId: string, payload: any) {
  try {
    const subscriptions = await sql`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE user_id = ${userId}
    `;

    const notifications = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      return webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      ).catch((err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is no longer valid
          console.log('Subscription has expired or is no longer valid: ', err);
          return sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
        }
        throw err;
      });
    });

    await Promise.all(notifications);
    return { success: true, count: notifications.length };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error };
  }
}

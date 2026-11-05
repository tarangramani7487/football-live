// Firebase Cloud Messaging: lets you send pushes from the Firebase console to every user.
//
// - Background / closed: Android and iOS show the notification themselves (Android uses the
//   "match-alerts" channel, set as the default in app.json).
// - Foreground: FCM shows nothing, so the message is re-shown as a local notification.
// - Tapping a push opens `data.url` (e.g. "/match/401234") when the message includes one.
import { useEffect } from 'react';
import { router } from 'expo-router';
import { ensurePermission, notifyMessage } from '@/notifications/alerts';
import { Messaging } from './native';

/** Topic every device joins, so the console can target "all users" by topic too. */
export const ALL_USERS_TOPIC = 'all';

// Background messages must have a handler registered at module scope (before the app renders).
// Notification messages are already displayed by the OS; nothing else to do here.
if (Messaging) Messaging.setBackgroundMessageHandler(Messaging.getMessaging(), async () => {});

function openFromMessage(data?: Record<string, unknown>) {
  const url = data?.url;
  if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
}

/** Call once in the root layout. */
export function usePushMessages() {
  useEffect(() => {
    if (!Messaging) return;
    const M = Messaging;
    const messaging = M.getMessaging();

    (async () => {
      try {
        await ensurePermission();
        const token = await M.getToken(messaging);
        // Paste this into Firebase console → Messaging → "Send test message" to test on your phone.
        if (__DEV__) console.log('[FCM] device token:', token);
        await M.subscribeToTopic(messaging, ALL_USERS_TOPIC);
      } catch (e) {
        if (__DEV__) console.warn('[FCM] setup failed', e);
      }
    })();

    const offMessage = M.onMessage(messaging, (m) => {
      const title = m.notification?.title ?? (typeof m.data?.title === 'string' ? m.data.title : undefined);
      const body = m.notification?.body ?? (typeof m.data?.body === 'string' ? m.data.body : '');
      if (title) notifyMessage(title, body, typeof m.data?.url === 'string' ? m.data.url : undefined);
    });
    const offOpened = M.onNotificationOpenedApp(messaging, (m) => openFromMessage(m.data));
    M.getInitialNotification(messaging)
      .then((m) => m && openFromMessage(m.data))
      .catch(() => {});

    return () => {
      offMessage();
      offOpened();
    };
  }, []);
}

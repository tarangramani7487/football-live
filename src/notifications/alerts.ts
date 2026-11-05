// Local notifications: permission, Android channel, kick-off reminders and instant alerts.
import { Platform } from 'react-native';
import type { Notification } from 'expo-notifications';
import { Notifications } from './native';

export const CHANNEL_ID = 'match-alerts';
/** False on web and when the installed app was built without notification support. */
export const notificationsSupported = !!Notifications;

let channelReady: Promise<unknown> | null = null;

function ensureChannel() {
  if (!Notifications || Platform.OS !== 'android') return Promise.resolve();
  channelReady ??= Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Match alerts',
    description: 'Kick-off, goals and full-time results for matches you follow',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: '#FCA311',
  });
  return channelReady;
}

/** Show alerts as banners even while the app is open. Call once at startup. */
export function configureNotifications() {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  ensureChannel();
}

/** Asks for permission if needed. Returns true when alerts can be shown. */
export async function ensurePermission(): Promise<boolean> {
  if (!Notifications) return false;
  await ensureChannel(); // Android 13+ shows the prompt only after a channel exists
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Shows a notification now. `url` (an app route) is opened when it's tapped. */
export async function notifyMessage(title: string, body: string, url?: string) {
  if (!Notifications) return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true, data: url ? { url } : {} },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
  });
}

/** Shows an alert now. `matchId` lets a tap open that match. */
export const notifyNow = (title: string, body: string, matchId: string) => notifyMessage(title, body, `/match/${matchId}`);

/** Schedules a reminder at kick-off. Returns its id, or undefined if kick-off already passed. */
export async function scheduleKickoff(matchId: string, home: string, away: string, kickoff: string) {
  if (!Notifications) return undefined;
  const date = new Date(kickoff);
  if (date.getTime() <= Date.now()) return undefined;
  await ensureChannel();
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Kick-off', body: `${home} vs ${away} is starting now`, sound: true, data: { url: `/match/${matchId}` } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}) },
  });
}

export async function cancelScheduled(id?: string) {
  if (!Notifications || !id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/** Calls `onOpen(url)` for the notification that launched the app and for every later tap. */
export function onNotificationOpened(onOpen: (url: string) => void) {
  if (!Notifications) return () => {};
  const N = Notifications;
  const handle = (n: Notification) => {
    const url = n.request.content.data?.url;
    if (typeof url === 'string') {
      onOpen(url);
      N.clearLastNotificationResponse();
    }
  };
  const last = N.getLastNotificationResponse();
  if (last?.notification) handle(last.notification);
  const sub = N.addNotificationResponseReceivedListener((r) => handle(r.notification));
  return () => sub.remove();
}

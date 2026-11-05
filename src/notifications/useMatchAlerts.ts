import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { configureNotifications, notificationsSupported, onNotificationOpened } from './alerts';
import { registerBackgroundAlerts } from './background';
import { getFollows, loadFollows } from './follows';
import { checkFollowedMatches } from './watcher';

const FOREGROUND_POLL_MS = 15000;

/**
 * App-wide alert wiring (call once in the root layout):
 * - tapping a notification opens its match
 * - while the app is open, followed matches are checked every 15s for goals / full time
 * Does nothing on web or when the installed app has no notification support.
 */
export function useMatchAlerts() {
  useEffect(() => {
    if (!notificationsSupported) return;
    configureNotifications();
    const removeTapListener = onNotificationOpened((url) => router.push(url as never));

    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      checkFollowedMatches();
      timer ??= setInterval(checkFollowedMatches, FOREGROUND_POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };

    loadFollows().then(() => {
      if (getFollows().length) registerBackgroundAlerts();
      if (AppState.currentState === 'active') start();
    });
    const appSub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));

    return () => {
      removeTapListener();
      appSub.remove();
      stop();
    };
  }, []);
}

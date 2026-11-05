// Firebase Analytics: screen views and a few app events. Every call is fire-and-forget and
// silently does nothing when Firebase isn't in the installed build (Expo Go, web).
import { useEffect } from 'react';
import { useSegments } from 'expo-router';
import { Analytics } from './native';

type Params = Record<string, string | number | boolean | undefined>;

export function logAppEvent(name: string, params?: Params) {
  if (!Analytics) return;
  const A = Analytics;
  // logEvent may return a promise or nothing depending on platform; never let it throw into the UI.
  Promise.resolve()
    .then(() => A.logEvent(A.getAnalytics(), name, params))
    .catch(() => {});
}

/**
 * Logs a `screen_view` whenever the route changes. Uses the route pattern
 * (e.g. "match/[id]", "matches") rather than the URL, so reports group all matches together.
 */
export function useScreenTracking() {
  const segments = useSegments();
  const screen = segments.filter((s) => !s.startsWith('(')).join('/') || 'home';
  useEffect(() => {
    logAppEvent('screen_view', { screen_name: screen, screen_class: screen });
  }, [screen]);
}

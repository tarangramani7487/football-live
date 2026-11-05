import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from 'expo-router';

type Options<T> = {
  /** Re-fetch silently on this interval (ms). Can depend on the latest data, e.g. poll only while a match is live. */
  pollMs?: number | ((data: T | undefined) => number | undefined);
  enabled?: boolean;
};

type State<T> = { key: string; data?: T; error?: string };

const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

/**
 * Loads data for a set of deps. Changing deps shows the loading state again;
 * refresh and polling keep the current data visible while re-fetching.
 */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[], { pollMs, enabled = true }: Options<T> = {}) {
  const key = JSON.stringify(deps);
  const [state, setState] = useState<State<T>>({ key: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const fetcherRef = useRef(fetcher);
  const keyRef = useRef(key);
  const lastLoadAt = useRef(0);
  const inFlight = useRef(false);
  useEffect(() => {
    fetcherRef.current = fetcher;
    keyRef.current = key;
  });

  const load = useCallback(async (forKey: string, keepError: boolean) => {
    inFlight.current = true;
    try {
      const data = await fetcherRef.current();
      if (keyRef.current === forKey) setState({ key: forKey, data });
    } catch (e) {
      if (keyRef.current !== forKey) return;
      // A failed background refresh keeps showing the stale data.
      setState((s) => (keepError && s.key === forKey && s.data !== undefined ? s : { key: forKey, data: s.key === forKey ? s.data : undefined, error: message(e) }));
    } finally {
      inFlight.current = false;
      lastLoadAt.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (enabled) load(key, false);
  }, [key, enabled, attempt, load]);

  const current = state.key === key ? state : undefined;
  const interval = typeof pollMs === 'function' ? pollMs(current?.data) : pollMs;

  // Poll only while this screen is focused and the app is in the foreground; when the user
  // comes back after the data went stale, refresh immediately instead of waiting a full interval.
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);
  const visible = focused && appActive;

  useEffect(() => {
    if (!enabled || !interval || !visible) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const tick = async () => {
      // Skip a tick if the previous request is still running (slow network) rather than stacking them.
      if (!inFlight.current) await load(key, true);
      if (!cancelled) timer = setTimeout(tick, interval);
    };
    const wait = interval - (Date.now() - lastLoadAt.current);
    timer = setTimeout(tick, Math.max(0, wait));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, enabled, interval, visible, load]);

  const refresh = async () => {
    setRefreshing(true);
    await load(key, true);
    setRefreshing(false);
  };

  const retry = () => {
    setState({ key: '' });
    setAttempt((n) => n + 1);
  };

  return {
    data: current?.data,
    error: current?.error,
    loading: enabled && !current,
    refreshing,
    refresh,
    retry,
  };
}

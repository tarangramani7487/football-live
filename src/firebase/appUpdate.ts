// "Please update" check driven by Firebase Remote Config.
//
// Remote Config parameters (Firebase console → Remote Config):
//   min_app_version     Installed versions below this MUST update (popup can't be closed).
//   latest_app_version  Installed versions below this get an optional popup with "Later".
//   update_message      Text shown in the popup (optional).
//   ios_store_url       App Store link, e.g. https://apps.apple.com/app/id1234567890 (iOS only).
//
// Versions are compared to app.json "version" (e.g. 1.0.0) — bump it with every store release.
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import { RemoteConfig } from './native';

export type UpdateInfo = { force: boolean; message: string; latest: string };

const DEFAULTS = {
  min_app_version: '0.0.0',
  latest_app_version: '0.0.0',
  update_message: 'A new version of Football Live is available with new features and fixes. Please update to continue.',
  ios_store_url: '',
};

/** -1 if a < b, 0 if equal, 1 if a > b. "1.10.0" > "1.9.2". */
export function compareVersions(a: string, b: string) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

let configured = false;

async function checkForUpdate(): Promise<UpdateInfo | null> {
  const current = Application.nativeApplicationVersion;
  if (!RemoteConfig || !current) return null;
  const R = RemoteConfig;
  const rc = R.getRemoteConfig();
  if (!configured) {
    configured = true;
    rc.defaultConfig = DEFAULTS;
    // Re-download at most every 15 min (instantly while developing).
    rc.settings = { minimumFetchIntervalMillis: __DEV__ ? 0 : 15 * 60 * 1000, fetchTimeoutMillis: 10000 };
  }
  await R.fetchAndActivate(rc);

  const min = R.getValue(rc, 'min_app_version').asString();
  const latest = R.getValue(rc, 'latest_app_version').asString();
  const message = R.getValue(rc, 'update_message').asString() || DEFAULTS.update_message;
  if (compareVersions(current, min) < 0) return { force: true, message, latest: latest || min };
  if (compareVersions(current, latest) < 0) return { force: false, message, latest };
  return null;
}

/** Opens this app's page in the Play Store / App Store. */
export async function openStore() {
  if (Platform.OS === 'android') {
    const id = Application.applicationId;
    const market = `market://details?id=${id}`;
    return Linking.openURL(market).catch(() => Linking.openURL(`https://play.google.com/store/apps/details?id=${id}`));
  }
  const url = RemoteConfig?.getValue(RemoteConfig.getRemoteConfig(), 'ios_store_url').asString();
  if (url) return Linking.openURL(url);
}

/**
 * Checks on launch and every time the app comes back to the foreground, so the popup
 * disappears by itself once the user has updated (the new version passes the check).
 */
export function useAppUpdate() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (!RemoteConfig) return;
    const run = () =>
      checkForUpdate()
        .then(setUpdate)
        .catch(() => {}); // offline etc. — never block the app on a failed check
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
  }, []);

  // "Later" hides an optional update until a newer version is published (or the app restarts).
  const later = useCallback(() => setDismissed(update?.latest ?? null), [update]);
  const visible = !!update && (update.force || dismissed !== update.latest);
  return { update: visible ? update : null, later };
}

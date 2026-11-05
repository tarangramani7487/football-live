// React Native Firebase throws at import time when the installed app binary doesn't contain its
// native code (Expo Go, or a build made before Firebase was added). Check first and load lazily,
// so the app keeps working with Firebase simply switched off — same approach as notifications/native.ts.
import { Platform, TurboModuleRegistry } from 'react-native';

const has = (name: string) => Platform.OS !== 'web' && !!TurboModuleRegistry.get(name);

type AnalyticsModule = typeof import('@react-native-firebase/analytics');
type MessagingModule = typeof import('@react-native-firebase/messaging');
type RemoteConfigModule = typeof import('@react-native-firebase/remote-config');

/* eslint-disable @typescript-eslint/no-require-imports */
// The native module can be present while no default app exists — that happens when the build has no
// google-services.json / GoogleService-Info.plist. Every Firebase call would then throw, so switch off.
const appAvailable = (() => {
  if (!has('NativeRNFBTurboApp')) return false;
  try {
    const ok = (require('@react-native-firebase/app') as typeof import('@react-native-firebase/app')).getApps().length > 0;
    if (!ok && __DEV__) console.warn('[Firebase] No default app — add the platform config file and rebuild. Firebase is off.');
    return ok;
  } catch {
    return false;
  }
})();

export const Analytics: AnalyticsModule | null =
  appAvailable && has('NativeRNFBTurboAnalytics') ? require('@react-native-firebase/analytics') : null;
export const Messaging: MessagingModule | null =
  appAvailable && has('NativeRNFBTurboMessaging') ? require('@react-native-firebase/messaging') : null;
export const RemoteConfig: RemoteConfigModule | null =
  appAvailable && has('NativeRNFBTurboConfig') ? require('@react-native-firebase/remote-config') : null;
/* eslint-enable @typescript-eslint/no-require-imports */

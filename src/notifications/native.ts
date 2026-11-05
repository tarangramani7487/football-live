// The notification / background-task packages throw at import time when the installed app binary
// doesn't contain their native code (an older build, or Expo Go). Check first and load them lazily,
// so the app keeps working with alerts simply switched off.
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export const has = (...modules: string[]) => Platform.OS !== 'web' && modules.every((m) => !!requireOptionalNativeModule(m));

export const notificationsAvailable = has('ExpoPushTokenManager', 'ExpoNotificationScheduler', 'ExpoNotificationPermissionsModule');
export const backgroundTasksAvailable = has('ExpoTaskManager', 'ExpoBackgroundTask');

type NotificationsModule = typeof import('expo-notifications');
type TaskManagerModule = typeof import('expo-task-manager');
type BackgroundTaskModule = typeof import('expo-background-task');

/* eslint-disable @typescript-eslint/no-require-imports */
export const Notifications: NotificationsModule | null = notificationsAvailable ? require('expo-notifications') : null;
export const TaskManager: TaskManagerModule | null = backgroundTasksAvailable ? require('expo-task-manager') : null;
export const BackgroundTask: BackgroundTaskModule | null = backgroundTasksAvailable ? require('expo-background-task') : null;
/* eslint-enable @typescript-eslint/no-require-imports */

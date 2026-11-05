// Background check for followed matches. The OS decides when it runs (roughly every 15+ minutes),
// so goal alerts are instant only while the app is open; this catches up when it is closed.
import { BackgroundTask, TaskManager } from './native';
import { checkFollowedMatches } from './watcher';

const TASK = 'football-live-match-alerts';

// Must be defined at module scope so it exists when the OS wakes the app in the background.
if (TaskManager && BackgroundTask) {
  const BT = BackgroundTask;
  TaskManager.defineTask(TASK, async () => {
    try {
      await checkFollowedMatches();
      return BT.BackgroundTaskResult.Success;
    } catch {
      return BT.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerBackgroundAlerts() {
  if (!TaskManager || !BackgroundTask) return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (!(await TaskManager.isTaskRegisteredAsync(TASK))) {
      await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
    }
  } catch {
    // Background work not permitted here; foreground checks still work.
  }
}

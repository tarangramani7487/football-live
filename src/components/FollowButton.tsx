import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MatchState } from '@/api/espn';
import { cancelScheduled, ensurePermission, notificationsSupported, scheduleKickoff } from '@/notifications/alerts';
import { registerBackgroundAlerts } from '@/notifications/background';
import { addFollow, removeFollow, useFollows } from '@/notifications/follows';
import { logAppEvent } from '@/firebase/analytics';
import { checkFollowedMatches } from '@/notifications/watcher';
import { colors } from '@/constants/theme';

export type FollowTarget = {
  id: string;
  home: string;
  away: string;
  kickoff: string;
  state: MatchState;
  homeScore?: string | number;
  awayScore?: string | number;
  league?: string;
};

/** Bell that turns kick-off / goal / full-time alerts on or off for one match. Hidden on web and for finished matches. */
export function FollowButton({ match, light, size = 20 }: { match: FollowTarget; light?: boolean; size?: number }) {
  const follows = useFollows();
  const [busy, setBusy] = useState(false);
  const followed = follows[match.id];

  if (!notificationsSupported || (match.state === 'post' && !followed)) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (followed) {
        await cancelScheduled(followed.kickoffNotificationId);
        await removeFollow(match.id);
        logAppEvent('unfollow_match', { match_id: match.id });
        return;
      }
      if (!(await ensurePermission())) {
        Alert.alert('Notifications are off', 'Allow notifications for Football Live in Settings to get goal alerts.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const kickoffNotificationId = match.state === 'pre' ? await scheduleKickoff(match.id, match.home, match.away, match.kickoff) : undefined;
      await addFollow({
        id: match.id,
        home: match.home,
        away: match.away,
        kickoff: match.kickoff,
        league: match.league,
        state: match.state,
        homeScore: Number(match.homeScore ?? 0) || 0,
        awayScore: Number(match.awayScore ?? 0) || 0,
        kickoffNotificationId,
      });
      logAppEvent('follow_match', { match_id: match.id, league: match.league });
      registerBackgroundAlerts();
      checkFollowedMatches();
    } finally {
      setBusy(false);
    }
  };

  const color = followed ? colors.accent : light ? colors.white : colors.textMuted;
  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={followed ? 'Turn off match alerts' : 'Turn on match alerts'}
    >
      <Ionicons name={followed ? 'notifications' : 'notifications-outline'} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 4 },
});

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/constants/theme';
import { useMatchAlerts } from '@/notifications/useMatchAlerts';
import { useScreenTracking } from '@/firebase/analytics';
import { usePushMessages } from '@/firebase/messaging';
import { UpdateModal } from '@/components/UpdateModal';
// Defines the background task at module scope so the OS can run it while the app is closed.
import '@/notifications/background';

export default function RootLayout() {
  useMatchAlerts();
  usePushMessages();
  useScreenTracking();

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="match/[id]" options={{ title: 'Match' }} />
        <Stack.Screen name="team/[id]" options={{ title: 'Team' }} />
        <Stack.Screen name="player/[id]" options={{ title: 'Player' }} />
        <Stack.Screen name="league/[slug]" options={{ title: 'League' }} />
        <Stack.Screen name="news/[id]" options={{ title: 'News' }} />
        <Stack.Screen name="video/[id]" options={{ title: 'Video' }} />
      </Stack>
      <UpdateModal />
    </>
  );
}

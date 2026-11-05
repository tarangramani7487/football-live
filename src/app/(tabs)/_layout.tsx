import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderLogo } from '@/components/HeaderLogo';
import { colors } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  };

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        // FL logo on the top left of every tab.
        headerTitle: HeaderLogo,
        headerTitleAlign: 'left',
        tabBarActiveTintColor: colors.primary,
        tabBarLabelStyle: { fontWeight: '700' },
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches', tabBarIcon: icon('football') }} />
      <Tabs.Screen name="news" options={{ title: 'News', tabBarIcon: icon('newspaper') }} />
      <Tabs.Screen name="videos" options={{ title: 'Videos', tabBarIcon: icon('play-circle') }} />
      <Tabs.Screen name="leagues" options={{ title: 'Leagues', tabBarIcon: icon('trophy') }} />
    </Tabs>
  );
}

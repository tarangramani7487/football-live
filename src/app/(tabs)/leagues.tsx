import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Logo } from '@/components/Logo';
import { LEAGUES } from '@/constants/leagues';
import { colors } from '@/constants/theme';

export default function LeaguesScreen() {
  return (
    <FlatList
      data={LEAGUES}
      keyExtractor={(l) => l.slug}
      contentContainerStyle={{ paddingVertical: 8 }}
      renderItem={({ item }) => (
        <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} onPress={() => router.push(`/league/${item.slug}`)}>
          <Logo uri={item.logo} size={34} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.country}>{item.country}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  country: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});

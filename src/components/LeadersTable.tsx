import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Leader } from '@/api/espn';
import { colors } from '@/constants/theme';
import { Logo } from './Logo';

export function LeadersTable({ leaders, valueLabel }: { leaders: Leader[]; valueLabel: string }) {
  return (
    <View style={styles.card}>
      <View style={[styles.row, styles.header]}>
        <Text style={[styles.rank, styles.headText]}>#</Text>
        <Text style={[styles.player, styles.headText]}>Player</Text>
        <Text style={[styles.cell, styles.headText]}>Apps</Text>
        <Text style={[styles.value, styles.headText]}>{valueLabel}</Text>
      </View>
      {leaders.map((l) => (
        <Pressable key={l.playerId} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]} onPress={() => router.push(`/player/${l.playerId}`)}>
          <Text style={[styles.rank, l.rank <= 3 && styles.top]}>{l.rank}</Text>
          <View style={[styles.player, styles.playerCell]}>
            <Logo uri={l.teamLogo} size={20} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {l.name}
              </Text>
              {!!l.team && (
                <Text style={styles.team} numberOfLines={1}>
                  {l.team}
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.cell}>{l.apps ?? '-'}</Text>
          <Text style={[styles.value, styles.valueText]}>{l.value}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  header: { paddingVertical: 8 },
  headText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  rank: { width: 26, textAlign: 'center', fontSize: 13, color: colors.text },
  top: { fontWeight: '800', color: colors.primary },
  player: { flex: 1 },
  playerCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  team: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  cell: { width: 40, textAlign: 'center', fontSize: 13, color: colors.textMuted },
  value: { width: 48, textAlign: 'center' },
  valueText: { fontSize: 16, fontWeight: '800', color: colors.text },
});

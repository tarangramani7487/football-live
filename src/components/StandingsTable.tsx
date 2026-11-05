import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { StandingGroup } from '@/api/espn';
import { colors } from '@/constants/theme';
import { Logo } from './Logo';

const COLS = ['P', 'W', 'D', 'L', 'GD', 'Pts'] as const;

export function StandingsTable({ groups, highlight }: { groups: StandingGroup[]; highlight?: string[] }) {
  const legend = new Map<string, string>();
  groups.forEach((g) => g.rows.forEach((r) => r.note && legend.set(r.note.description, r.note.color)));

  return (
    <View>
      {groups.map((g, gi) => (
        <View key={g.name + gi} style={styles.group}>
          {groups.length > 1 && <Text style={styles.groupName}>{g.name}</Text>}
          <View style={[styles.row, styles.header]}>
            <Text style={[styles.rank, styles.headText]}>#</Text>
            <Text style={[styles.team, styles.headText]}>Team</Text>
            {COLS.map((c) => (
              <Text key={c} style={[styles.cell, styles.headText, c === 'Pts' && styles.pts]}>
                {c}
              </Text>
            ))}
          </View>
          {g.rows.map((r) => (
            <Pressable
              key={r.teamId}
              onPress={() => router.push(`/team/${r.teamId}`)}
              style={[styles.row, highlight?.includes(r.teamId) && styles.highlight]}
            >
              <View style={[styles.noteBar, { backgroundColor: r.note?.color ?? 'transparent' }]} />
              <Text style={styles.rank}>{r.rank}</Text>
              <View style={[styles.team, styles.teamCell]}>
                <Logo uri={r.logo} size={18} />
                <Text style={styles.teamName} numberOfLines={1}>
                  {r.team}
                </Text>
              </View>
              {[r.played, r.won, r.drawn, r.lost, r.gd, r.points].map((v, i) => (
                <Text key={i} style={[styles.cell, i === 5 && styles.pts]}>
                  {v}
                </Text>
              ))}
            </Pressable>
          ))}
        </View>
      ))}
      {legend.size > 0 && (
        <View style={styles.legend}>
          {[...legend].map(([desc, color]) => (
            <View key={desc} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{desc}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: colors.card, marginBottom: 10 },
  groupName: { fontWeight: '700', fontSize: 14, padding: 12, paddingBottom: 4, color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingRight: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  header: { paddingLeft: 3 },
  headText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  highlight: { backgroundColor: colors.accentSoft },
  noteBar: { width: 3, alignSelf: 'stretch' },
  rank: { width: 28, textAlign: 'center', fontSize: 13, color: colors.text },
  team: { flex: 1 },
  teamCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamName: { flex: 1, fontSize: 14, color: colors.text },
  cell: { width: 30, textAlign: 'center', fontSize: 13, color: colors.text },
  pts: { fontWeight: '800', width: 34 },
  legend: { padding: 12, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.textMuted },
});

import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { clearMatchCache, getAllScoreboards, getMatchWindow, type LeagueMatches, type Match, type MatchDay, type MatchWindow } from '@/api/espn';
import { useLocalSearchParams } from 'expo-router';
import { useFetch } from '@/hooks/useFetch';
import { DateStrip, dayLabel, sameDay } from '@/components/DateStrip';
import { LeagueHeader } from '@/components/LeagueSection';
import { MatchCard } from '@/components/MatchCard';
import { Empty, ErrorView, Loading } from '@/components/States';
import { colors } from '@/constants/theme';

const MODES = ['Live', 'Recent', 'Upcoming', 'By Date'] as const;
type Mode = (typeof MODES)[number];
const WINDOW: Record<Exclude<Mode, 'By Date'>, MatchWindow> = { Live: 'live', Recent: 'recent', Upcoming: 'upcoming' };

const EMPTY: Record<Mode, string> = {
  Live: 'No live matches right now.\nCheck Recent for results or Upcoming for fixtures.',
  Recent: 'No results in the last 2 weeks',
  Upcoming: 'No fixtures in the next 2 weeks',
  'By Date': 'No matches on this day',
};

const plural = (n: number) => `${n} match${n === 1 ? '' : 'es'}`;
const SUMMARY: Record<Mode, (n: number) => string> = {
  Live: (n) => `${plural(n)} live now`,
  Recent: (n) => `${plural(n)} finished in the last 2 weeks`,
  Upcoming: (n) => `${plural(n)} in the next 2 weeks`,
  'By Date': (n) => plural(n),
};

/** Recent shows the last 2 weeks of results, Upcoming the next 2 weeks of fixtures. */
const RANGE_DAYS = 14;

const SORTS = ['League', 'Time'] as const;
type Sort = (typeof SORTS)[number];

type Section = { key: string; data: Match[]; dayLabel?: string; league?: Omit<LeagueMatches, 'matches'> };

/**
 * League (default): per day, grouped under league headers (Premier League, LALIGA, …).
 * Time: one list per day in kick-off order, with the league shown on each card.
 */
function toSections(days: MatchDay[], sort: Sort, showDays: boolean): Section[] {
  return days.flatMap((d) => {
    const label = showDays ? dayLabel(d.date) : undefined;
    if (sort === 'Time') {
      const data = d.sections.flatMap((s) => s.matches).sort((a, b) => a.date.localeCompare(b.date) || (a.leagueName ?? '').localeCompare(b.leagueName ?? ''));
      return [{ key: d.day, data, dayLabel: label }];
    }
    return d.sections.map((s, i) => ({ key: `${d.day}:${s.slug}`, data: s.matches, dayLabel: i === 0 ? label : undefined, league: s }));
  });
}

export default function MatchesScreen() {
  // Optional ?mode=Upcoming deep link.
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(() => MODES.find((m) => m === params.mode) ?? 'Live');
  const [date, setDate] = useState(() => new Date());
  const [sort, setSort] = useState<Sort>('League');
  const isToday = sameDay(date, new Date());

  const { data, error, loading, refreshing, refresh, retry } = useFetch<MatchDay[]>(
    async () => {
      if (mode === 'By Date') return [{ day: date.toDateString(), date, sections: await getAllScoreboards(date) }];
      return getMatchWindow(WINDOW[mode], RANGE_DAYS);
    },
    [mode, date.toDateString()],
    { pollMs: mode === 'Live' || (mode === 'By Date' && isToday) ? 15000 : undefined },
  );

  const sections = useMemo(() => toSections(data ?? [], sort, mode !== 'By Date'), [data, sort, mode]);
  const count = sections.reduce((n, s) => n + s.data.length, 0);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.modes}>
        {MODES.map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.mode, mode === m && styles.modeActive]}>
            {m === 'Live' && <View style={[styles.dot, mode === m && { backgroundColor: colors.primaryDark }]} />}
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m}</Text>
          </Pressable>
        ))}
      </View>
      {mode === 'By Date' && <DateStrip value={date} onChange={setDate} />}
      {loading ? (
        <Loading />
      ) : error && !data ? (
        <ErrorView message={error} onRetry={retry} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(m) => m.id}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            count > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summary} numberOfLines={2}>
                  {SUMMARY[mode](count)}
                </Text>
                <View style={styles.sortBox}>
                  {SORTS.map((o) => (
                    <Pressable key={o} onPress={() => setSort(o)} style={[styles.sort, sort === o && styles.sortActive]}>
                      <Text style={[styles.sortText, sort === o && styles.sortTextActive]}>{o}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : undefined
          }
          renderSectionHeader={({ section }) => (
            <View>
              {!!section.dayLabel && <Text style={styles.day}>{section.dayLabel}</Text>}
              {section.league ? (
                <LeagueHeader slug={section.league.slug} name={section.league.name} logo={section.league.logo} count={section.data.length} />
              ) : (
                <View style={styles.divider} />
              )}
            </View>
          )}
          renderItem={({ item, index, section }) =>
            sort === 'League' ? (
              <MatchCard match={item} joined={{ first: index === 0, last: index === section.data.length - 1 }} />
            ) : (
              <MatchCard match={item} showLeague />
            )
          }
          ListEmptyComponent={<Empty message={EMPTY[mode]} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                clearMatchCache();
                refresh();
              }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingBottom: 10, backgroundColor: colors.primary },
  mode: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)' },
  modeActive: { backgroundColor: colors.accent },
  modeText: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 13 },
  modeTextActive: { color: colors.primaryDark },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.live },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 12 },
  summary: { flex: 1, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  sortBox: { flexDirection: 'row', backgroundColor: colors.tint, borderRadius: 14, padding: 2 },
  sort: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  sortActive: { backgroundColor: colors.primary },
  sortText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  sortTextActive: { color: colors.white },
  divider: { height: 8 },
  day: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 2, fontSize: 16, fontWeight: '800', color: colors.text },
});

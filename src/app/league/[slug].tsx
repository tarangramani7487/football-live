import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { getLeagueLeaders, getLeagueScoreboard, getLeagueTeams, getNews, getStandings } from '@/api/espn';
import { useFetch } from '@/hooks/useFetch';
import { TopTabs } from '@/components/TopTabs';
import { DateStrip, sameDay } from '@/components/DateStrip';
import { Logo } from '@/components/Logo';
import { MatchCard } from '@/components/MatchCard';
import { NewsCard, NewsHero } from '@/components/NewsCard';
import { StandingsTable } from '@/components/StandingsTable';
import { LeadersTable } from '@/components/LeadersTable';
import { Empty, ErrorView, Loading } from '@/components/States';
import { getLeague } from '@/constants/leagues';
import { colors } from '@/constants/theme';

const TABS = ['Matches', 'Table', 'Stats', 'News', 'Teams'] as const;
type Tab = (typeof TABS)[number];

export default function LeagueScreen() {
  // name/logo params cover leagues that aren't in LEAGUES (e.g. opened from a live match elsewhere).
  const params = useLocalSearchParams<{ slug: string; name?: string; logo?: string }>();
  const slug = params.slug;
  const [tab, setTab] = useState<Tab>('Matches');
  const league = getLeague(slug) ?? (params.name ? { name: params.name, logo: params.logo, country: undefined } : undefined);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: league?.name ?? 'League' }} />
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Logo uri={league?.logo} size={44} />
        </View>
        <View>
          <Text style={styles.name}>{league?.name ?? slug}</Text>
          {!!league?.country && <Text style={styles.sub}>{league.country}</Text>}
        </View>
      </View>
      <TopTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'Matches' && <LeagueMatches slug={slug} />}
      {tab === 'Table' && <LeagueTable slug={slug} />}
      {tab === 'Stats' && <LeagueStats slug={slug} />}
      {tab === 'News' && <LeagueNews slug={slug} />}
      {tab === 'Teams' && <LeagueTeams slug={slug} />}
    </View>
  );
}

function LeagueMatches({ slug }: { slug: string }) {
  const [date, setDate] = useState(() => new Date());
  const isToday = sameDay(date, new Date());
  const { data, error, loading, refreshing, refresh, retry } = useFetch(() => getLeagueScoreboard(slug, date), [slug, date.toDateString()], {
    pollMs: isToday ? 15000 : undefined,
  });
  return (
    <View style={{ flex: 1 }}>
      <DateStrip value={date} onChange={setDate} />
      {loading ? (
        <Loading />
      ) : error && !data ? (
        <ErrorView message={error} onRetry={retry} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MatchCard match={item} />}
          ListEmptyComponent={<Empty message="No matches on this day. Try another date." />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </View>
  );
}

function LeagueTable({ slug }: { slug: string }) {
  const { data, error, loading, refreshing, refresh, retry } = useFetch(() => getStandings(slug), [slug]);
  if (loading) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={retry} />;
  if (!data?.some((g) => g.rows.length)) return <Empty message="No table for this competition yet" icon="list-outline" />;
  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} contentContainerStyle={{ paddingTop: 10 }}>
      <StandingsTable groups={data} />
    </ScrollView>
  );
}

const BOARD_LABEL: Record<string, string> = { goalsLeaders: 'Goals', assistsLeaders: 'Assists' };

function LeagueStats({ slug }: { slug: string }) {
  const { data, error, loading, refreshing, refresh, retry } = useFetch(() => getLeagueLeaders(slug), [slug]);
  const [board, setBoard] = useState('goalsLeaders');
  if (loading) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={retry} />;
  const boards = (data ?? []).filter((b) => b.leaders.length > 0);
  if (!boards.length) return <Empty message="No player stats for this competition yet" icon="stats-chart-outline" />;
  const current = boards.find((b) => b.key === board) ?? boards[0];
  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <View style={styles.chips}>
        {boards.map((b) => (
          <Pressable key={b.key} onPress={() => setBoard(b.key)} style={[styles.chip, current.key === b.key && styles.chipActive]}>
            <Text style={[styles.chipText, current.key === b.key && styles.chipTextActive]}>Most {b.title}</Text>
          </Pressable>
        ))}
      </View>
      <LeadersTable leaders={current.leaders} valueLabel={BOARD_LABEL[current.key] ?? current.title} />
    </ScrollView>
  );
}

function LeagueNews({ slug }: { slug: string }) {
  const { data, error, loading, retry } = useFetch(() => getNews(slug, 30), [slug]);
  if (loading) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={retry} />;
  if (!data?.length) return <Empty message="No news for this league" icon="newspaper-outline" />;
  return (
    <FlatList
      data={data}
      keyExtractor={(a) => a.id}
      renderItem={({ item, index }) => (index === 0 ? <NewsHero article={item} /> : <NewsCard article={item} />)}
      contentContainerStyle={{ paddingVertical: 12 }}
    />
  );
}

function LeagueTeams({ slug }: { slug: string }) {
  const { data, error, loading, retry } = useFetch(() => getLeagueTeams(slug), [slug]);
  if (loading) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={retry} />;
  return (
    <FlatList
      data={data ?? []}
      numColumns={3}
      keyExtractor={(t) => t.id}
      contentContainerStyle={{ padding: 6 }}
      ListEmptyComponent={<Empty message="No teams found" icon="shield-outline" />}
      renderItem={({ item }) => (
        <Pressable style={({ pressed }) => [styles.teamTile, pressed && { opacity: 0.7 }]} onPress={() => router.push(`/team/${item.id}`)}>
          <Logo uri={item.logo} size={46} />
          <Text style={styles.teamName} numberOfLines={2}>
            {item.name}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: colors.primaryDark },
  logoWrap: { backgroundColor: colors.white, borderRadius: 34, padding: 8 },
  name: { color: colors.white, fontSize: 19, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  teamTile: { flex: 1 / 3, alignItems: 'center', backgroundColor: colors.card, margin: 4, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 10, gap: 8 },
  teamName: { fontSize: 12, fontWeight: '600', textAlign: 'center', color: colors.text },
  chips: { flexDirection: 'row', gap: 8, padding: 10, backgroundColor: colors.card },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.bg },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.white },
});

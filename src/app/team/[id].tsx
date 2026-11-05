import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTeam, getTeamNews, getTeamSchedule, getTeamSquad, type SquadPlayer } from '@/api/espn';
import { useFetch } from '@/hooks/useFetch';
import { TopTabs } from '@/components/TopTabs';
import { Logo } from '@/components/Logo';
import { MatchCard } from '@/components/MatchCard';
import { NewsCard, NewsHero } from '@/components/NewsCard';
import { Empty, ErrorView, Loading } from '@/components/States';
import { WikiCard } from '@/components/WikiCard';
import { colors, radius } from '@/constants/theme';

const TABS = ['Fixtures', 'Results', 'Squad', 'News', 'About'] as const;
type Tab = (typeof TABS)[number];

export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('Fixtures');
  const team = useFetch(() => getTeam(id), [id]);

  if (team.loading) return <Loading />;
  if (team.error || !team.data) return <ErrorView message={team.error ?? 'Team not found'} onRetry={team.retry} />;
  const t = team.data;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: t.name }} />
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Logo uri={t.logo} size={60} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{t.name}</Text>
          {!!t.standing && <Text style={styles.sub}>{t.standing}</Text>}
          {!!t.record && <Text style={styles.sub}>Record (W-D-L): {t.record}</Text>}
          {!!t.venue && (
            <View style={styles.venueRow}>
              <MaterialCommunityIcons name="stadium" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.sub}>{t.venue}</Text>
            </View>
          )}
        </View>
      </View>
      <TopTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'Fixtures' && <ScheduleList teamId={id} fixtures />}
      {tab === 'Results' && <ScheduleList teamId={id} fixtures={false} />}
      {tab === 'Squad' && <Squad teamId={id} leagueSlug={t.leagueSlug} />}
      {tab === 'News' && <TeamNews teamId={id} />}
      {tab === 'About' && (
        <ScrollView contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
          <WikiCard search={`${t.name} football club`} title={`About ${t.name}`} showEmpty />
        </ScrollView>
      )}
    </View>
  );
}

function ScheduleList({ teamId, fixtures }: { teamId: string; fixtures: boolean }) {
  const { data, error, loading, refreshing, refresh, retry } = useFetch(() => getTeamSchedule(teamId, fixtures), [teamId, fixtures]);
  if (loading) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={retry} />;
  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      {data?.length ? data.map((m) => <MatchCard key={m.id} match={m} showLeague />) : <Empty message={fixtures ? 'No upcoming fixtures' : 'No results yet'} />}
    </ScrollView>
  );
}

const POSITION_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

function Squad({ teamId, leagueSlug }: { teamId: string; leagueSlug?: string }) {
  const { data, error, loading, retry } = useFetch(() => getTeamSquad(leagueSlug!, teamId), [teamId, leagueSlug], { enabled: !!leagueSlug });
  if (!leagueSlug) return <Empty message="Squad not available" icon="people-outline" />;
  if (loading) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={retry} />;
  if (!data?.length) return <Empty message="Squad not available" icon="people-outline" />;

  const groups = new Map<string, SquadPlayer[]>();
  for (const p of data) groups.set(p.position, [...(groups.get(p.position) ?? []), p]);
  const ordered = [...groups].sort(([a], [b]) => {
    const ia = POSITION_ORDER.indexOf(a);
    const ib = POSITION_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
      {ordered.map(([position, players]) => (
        <View key={position} style={styles.card}>
          <Text style={styles.cardTitle}>{position}s</Text>
          {players.map((p) => (
            <Pressable key={p.id} style={styles.player} onPress={() => router.push(`/player/${p.id}`)}>
              {p.headshot ? (
                <Image source={{ uri: p.headshot }} style={styles.headshot} contentFit="cover" />
              ) : (
                <View style={[styles.headshot, styles.jerseyCircle]}>
                  <Text style={styles.jerseyText}>{p.jersey ?? '-'}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.playerName}>{p.name}</Text>
                <Text style={styles.playerMeta}>
                  {[p.jersey && `#${p.jersey}`, p.age && `${p.age} yrs`, p.nationality].filter(Boolean).join(' • ')}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function TeamNews({ teamId }: { teamId: string }) {
  const { data, error, loading, retry } = useFetch(() => getTeamNews(teamId), [teamId]);
  if (loading) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={retry} />;
  if (!data?.length) return <Empty message="No news for this team" icon="newspaper-outline" />;
  const [hero, ...rest] = data;
  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
      <NewsHero article={hero} />
      {rest.map((a) => (
        <NewsCard key={a.id} article={a} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: colors.primaryDark },
  logoWrap: { backgroundColor: colors.white, borderRadius: 40, padding: 10 },
  name: { color: colors.white, fontSize: 20, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 3 },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  card: { backgroundColor: colors.card, marginHorizontal: 10, marginTop: 10, borderRadius: radius.md, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6 },
  player: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headshot: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bg },
  jerseyCircle: { alignItems: 'center', justifyContent: 'center' },
  jerseyText: { fontWeight: '800', color: colors.primary },
  playerName: { fontSize: 15, fontWeight: '600', color: colors.text },
  playerMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});

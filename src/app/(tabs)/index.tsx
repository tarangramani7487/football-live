import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { clearMatchCache, getMatchWindow, getVideos, type Match, type MatchDay } from '@/api/espn';
import { getFeed } from '@/api/news';
import { useFetch } from '@/hooks/useFetch';
import { MiniMatchCard } from '@/components/MatchCard';
import { NewsCard, NewsHero, VideoTile } from '@/components/NewsCard';
import { SectionTitle } from '@/components/LeagueSection';
import { Empty, ErrorView, Loading } from '@/components/States';
import { colors } from '@/constants/theme';

const flat = (days: MatchDay[]) => days.flatMap((d) => d.sections.flatMap((s) => s.matches));
const none: MatchDay[] = [];

// Shares the 2-week cache with the Matches tab; only the small live feed is polled (every 15s).
async function loadHome() {
  const [recent, upcoming, news, videos] = await Promise.all([
    getMatchWindow('recent').catch(() => none),
    getMatchWindow('upcoming').catch(() => none),
    getFeed('top', 15),
    getVideos().catch(() => []),
  ]);
  return {
    recent: flat(recent).slice(0, 15),
    upcoming: flat(upcoming).slice(0, 15),
    news,
    videos: videos.slice(0, 10),
  };
}

const loadLive = async () => flat(await getMatchWindow('live'));

function MatchRow({ matches }: { matches: Match[] }) {
  return (
    <FlatList
      horizontal
      data={matches}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => <MiniMatchCard match={item} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 4 }}
    />
  );
}

export default function HomeScreen() {
  const { data, error, loading, refreshing, refresh, retry } = useFetch(loadHome, []);
  const live = useFetch(loadLive, [], { pollMs: 15000 }).data ?? [];

  if (loading) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={retry} />;

  const [hero, ...rest] = data?.news ?? [];

  return (
    <ScrollView
      style={styles.screen}
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
    >
      <View style={styles.matchesBg}>
        {live.length > 0 && (
          <>
            <SectionTitle title="Live Now" action="See all" onAction={() => router.navigate('/matches')} light live />
            <MatchRow matches={live} />
          </>
        )}
        {!!data?.upcoming.length && (
          <>
            <SectionTitle title="Upcoming Matches" action="See all" onAction={() => router.navigate('/matches')} light />
            <MatchRow matches={data.upcoming} />
          </>
        )}
        {!!data?.recent.length && (
          <>
            <SectionTitle title="Recent Results" action="See all" onAction={() => router.navigate('/matches')} light />
            <MatchRow matches={data.recent} />
          </>
        )}
        {!live.length && !data?.upcoming.length && !data?.recent.length && <Empty message="No matches right now in the top leagues" />}
        <View style={{ height: 16 }} />
      </View>

      <SectionTitle title="Top Stories" action="More news" onAction={() => router.navigate('/news')} />
      {hero && <NewsHero article={hero} />}
      {rest.slice(0, 6).map((a) => (
        <NewsCard key={a.id} article={a} />
      ))}

      {!!data?.videos.length && (
        <>
          <SectionTitle title="Latest Videos" action="All videos" onAction={() => router.navigate('/videos')} />
          <FlatList
            horizontal
            data={data.videos}
            keyExtractor={(v) => v.id}
            renderItem={({ item }) => <VideoTile article={item} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12 }}
          />
        </>
      )}

      {rest.length > 6 && <SectionTitle title="More Stories" />}
      {rest.slice(6).map((a) => (
        <NewsCard key={a.id} article={a} />
      ))}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  matchesBg: { backgroundColor: colors.primary, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
});

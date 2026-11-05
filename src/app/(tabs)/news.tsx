import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getNews } from '@/api/espn';
import { FEEDS, getFeed } from '@/api/news';
import { useFetch } from '@/hooks/useFetch';
import { NewsCard, NewsHero } from '@/components/NewsCard';
import { Empty, ErrorView, Loading } from '@/components/States';
import { LEAGUES } from '@/constants/leagues';
import { colors } from '@/constants/theme';

// Publisher feeds first, then ESPN's per-league feeds.
const CHIPS = [...FEEDS, ...LEAGUES.slice(0, 10).map((l) => ({ id: `league:${l.slug}`, label: l.short }))];

const load = (id: string) => (id.startsWith('league:') ? getNews(id.slice(7), 40) : getFeed(id, 40));

export default function NewsScreen() {
  const [feed, setFeed] = useState('top');
  const { data, error, loading, refreshing, refresh, retry } = useFetch(() => load(feed), [feed]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.chipsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CHIPS.map((c) => (
            <Pressable key={c.id} onPress={() => setFeed(c.id)} style={[styles.chip, feed === c.id && styles.chipActive]}>
              <Text style={[styles.chipText, feed === c.id && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {loading ? (
        <Loading />
      ) : error && !data ? (
        <ErrorView message={error} onRetry={retry} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(a) => a.id}
          renderItem={({ item, index }) => (index === 0 ? <NewsHero article={item} /> : <NewsCard article={item} />)}
          ListEmptyComponent={<Empty message="No news right now" icon="newspaper-outline" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingVertical: 12 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipsBar: { backgroundColor: colors.card },
  chips: { gap: 8, padding: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.bg },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.white },
});

import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getVideos } from '@/api/espn';
import { useFetch } from '@/hooks/useFetch';
import { NewsCard, NewsHero } from '@/components/NewsCard';
import { Empty, ErrorView, Loading } from '@/components/States';
import { TOP_NEWS_LEAGUES, getLeague } from '@/constants/leagues';
import { colors } from '@/constants/theme';

const CHIPS = [{ slug: '', label: 'All' }, ...TOP_NEWS_LEAGUES.map((s) => ({ slug: s, label: getLeague(s)?.short ?? s }))];

export default function VideosScreen() {
  const [slug, setSlug] = useState('');
  const { data, error, loading, refreshing, refresh, retry } = useFetch(() => getVideos(slug || undefined), [slug]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.chipsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CHIPS.map((c) => (
            <Pressable key={c.slug} onPress={() => setSlug(c.slug)} style={[styles.chip, slug === c.slug && styles.chipActive]}>
              <Text style={[styles.chipText, slug === c.slug && styles.chipTextActive]}>{c.label}</Text>
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
          ListEmptyComponent={<Empty message="No videos right now" icon="videocam-outline" />}
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

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { getArticle } from '@/api/espn';
import { useFetch } from '@/hooks/useFetch';
import { timeAgo } from '@/components/NewsCard';
import { ErrorView, Loading } from '@/components/States';
import { colors, radius } from '@/constants/theme';

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: a, error, loading, retry } = useFetch(() => getArticle(id), [id]);

  if (loading) return <Loading />;
  if (error || !a) return <ErrorView message={error ?? 'Article not found'} onRetry={retry} />;

  return (
    <ScrollView style={{ backgroundColor: colors.card }} contentContainerStyle={{ paddingBottom: 40 }}>
      {a.image && <Image source={{ uri: a.image }} style={styles.image} contentFit="cover" transition={200} />}
      <View style={styles.body}>
        <Text style={styles.headline}>{a.headline}</Text>
        <Text style={styles.meta}>{[a.byline, timeAgo(a.published)].filter(Boolean).join(' • ')}</Text>

        {a.related.length > 0 && (
          <View style={styles.tags}>
            {a.related.map((r) => (
              <Pressable
                key={`${r.type}-${r.id}`}
                style={styles.tag}
                onPress={() => router.push(r.type === 'team' ? `/team/${r.id}` : `/player/${r.id}`)}
              >
                <Ionicons name={r.type === 'team' ? 'shield-outline' : 'person-outline'} size={13} color={colors.primary} />
                <Text style={styles.tagText}>{r.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {a.paragraphs.length ? (
          a.paragraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p}
            </Text>
          ))
        ) : (
          <Text style={styles.paragraph}>{a.description}</Text>
        )}

        {!!a.url && (
          <Pressable style={styles.source} onPress={() => WebBrowser.openBrowserAsync(a.url!)}>
            <Text style={styles.sourceText}>Read on ESPN</Text>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.border },
  body: { padding: 16 },
  headline: { fontSize: 22, fontWeight: '800', color: colors.text, lineHeight: 29 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.primary, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  paragraph: { fontSize: 16, lineHeight: 25, color: colors.text, marginTop: 14 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 20, padding: 10, borderRadius: radius.sm, backgroundColor: colors.bg },
  sourceText: { color: colors.primary, fontWeight: '700' },
});

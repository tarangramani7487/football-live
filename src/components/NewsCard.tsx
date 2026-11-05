import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { Article } from '@/api/espn';
import { colors, radius } from '@/constants/theme';

export function timeAgo(iso?: string) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

/** ESPN stories and clips open natively; other publishers open in the in-app browser. */
export function openArticle(a: Article) {
  if (a.isVideo) router.push({ pathname: '/video/[id]', params: { id: a.id } });
  else if (a.source && a.source !== 'ESPN') {
    if (a.url) WebBrowser.openBrowserAsync(a.url);
  } else router.push({ pathname: '/news/[id]', params: { id: a.id } });
}

function Meta({ article }: { article: Article }) {
  return (
    <View style={styles.metaRow}>
      {!!article.source && <Text style={styles.source}>{article.source}</Text>}
      <Text style={styles.meta}>{timeAgo(article.published)}</Text>
    </View>
  );
}

function PlayBadge({ size = 34 }: { size?: number }) {
  return (
    <View style={[styles.play, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="play" size={size * 0.5} color={colors.primaryDark} style={{ marginLeft: 2 }} />
    </View>
  );
}

/** Large hero card for the first story in a feed. */
export function NewsHero({ article }: { article: Article }) {
  return (
    <Pressable style={({ pressed }) => [styles.hero, pressed && { opacity: 0.85 }]} onPress={() => openArticle(article)}>
      {article.image && (
        <View>
          <Image source={{ uri: article.image }} style={styles.heroImage} contentFit="cover" transition={200} />
          {article.isVideo && <View style={styles.center}><PlayBadge size={52} /></View>}
        </View>
      )}
      <View style={{ padding: 14 }}>
        <Meta article={article} />
        <Text style={styles.heroTitle}>{article.headline}</Text>
        {!!article.description && article.description !== article.headline && (
          <Text style={styles.desc} numberOfLines={2}>
            {article.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function NewsCard({ article }: { article: Article }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} onPress={() => openArticle(article)}>
      {article.image && (
        <View>
          <Image source={{ uri: article.image }} style={styles.thumb} contentFit="cover" transition={200} />
          {article.isVideo && <View style={styles.center}><PlayBadge size={26} /></View>}
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={3}>
          {article.headline}
        </Text>
        <Meta article={article} />
      </View>
    </Pressable>
  );
}

/** Thumbnail tile for horizontal video rows. */
export function VideoTile({ article }: { article: Article }) {
  return (
    <Pressable style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]} onPress={() => openArticle(article)}>
      <View>
        <Image source={{ uri: article.image }} style={styles.tileImage} contentFit="cover" transition={200} />
        <View style={styles.center}>
          <PlayBadge />
        </View>
      </View>
      <Text style={styles.tileTitle} numberOfLines={2}>
        {article.headline}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.card, borderRadius: radius.md, overflow: 'hidden', marginHorizontal: 12, marginBottom: 10 },
  heroImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.tint },
  heroTitle: { fontSize: 18, fontWeight: '800', color: colors.text, lineHeight: 24, marginTop: 6 },
  desc: { fontSize: 14, color: colors.textMuted, marginTop: 6, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    padding: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: radius.md,
  },
  title: { fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 21 },
  thumb: { width: 104, height: 72, borderRadius: radius.sm, backgroundColor: colors.tint },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  source: { fontSize: 11, fontWeight: '800', color: colors.primary, backgroundColor: colors.tint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  meta: { fontSize: 12, color: colors.textMuted },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  play: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  tile: { width: 220, marginRight: 10 },
  tileImage: { width: 220, height: 124, borderRadius: radius.md, backgroundColor: colors.tint },
  tileTitle: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 6, lineHeight: 18 },
});

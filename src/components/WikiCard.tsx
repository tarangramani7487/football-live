import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { getWikiSummary } from '@/api/sources';
import { useFetch } from '@/hooks/useFetch';
import { colors, radius } from '@/constants/theme';
import { Empty, Loading } from './States';

/** Wikipedia summary card. Renders nothing (or an empty state) when no football page matches. */
export function WikiCard({ search, title = 'About', showEmpty }: { search: string; title?: string; showEmpty?: boolean }) {
  const { data, loading } = useFetch(() => getWikiSummary(search), [search]);

  if (loading) return showEmpty ? <Loading /> : null;
  if (!data) return showEmpty ? <Empty message="No background information found" icon="book-outline" /> : null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {data.image && <Image source={{ uri: data.image }} style={styles.image} contentFit="contain" transition={200} />}
      {!!data.description && <Text style={styles.description}>{data.description}</Text>}
      <Text style={styles.extract}>{data.extract}</Text>
      <Pressable style={styles.link} onPress={() => WebBrowser.openBrowserAsync(data.url)}>
        <Ionicons name="book-outline" size={15} color={colors.primary} />
        <Text style={styles.linkText}>Read more on Wikipedia</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, marginHorizontal: 10, marginTop: 10, borderRadius: radius.md, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 10 },
  image: { width: '100%', height: 180, borderRadius: radius.sm, backgroundColor: colors.tint, marginBottom: 10 },
  description: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  extract: { fontSize: 15, lineHeight: 23, color: colors.text },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  linkText: { color: colors.primary, fontWeight: '700' },
});

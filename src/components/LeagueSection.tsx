import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getLeague } from '@/constants/leagues';
import { colors } from '@/constants/theme';
import { LiveDot } from './EventIcon';
import { Logo } from './Logo';

/** League heading above its matches; tapping opens the league page. */
export function LeagueHeader({ slug, name, logo, count }: { slug: string; name: string; logo?: string; count?: number }) {
  const country = getLeague(slug)?.country;
  const sub = [country, count != null ? `${count} match${count === 1 ? '' : 'es'}` : undefined].filter(Boolean).join(' • ');
  return (
    <Pressable
      style={({ pressed }) => [styles.header, pressed && { opacity: 0.7 }]}
      onPress={() => router.push({ pathname: '/league/[slug]', params: { slug, name, logo } })}
    >
      <View style={styles.logoWrap}>
        <Logo uri={logo} size={22} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {!!sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

type SectionTitleProps = { title: string; action?: string; onAction?: () => void; light?: boolean; live?: boolean };

export function SectionTitle({ title, action, onAction, light, live }: SectionTitleProps) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.titleRow}>
        {live && <LiveDot size={9} />}
        <Text style={[styles.sectionText, light && { color: colors.white }]}>{title}</Text>
      </View>
      {action && (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={[styles.action, light && { color: colors.accent }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginTop: 16, marginBottom: 2 },
  logoWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 16, paddingBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionText: { fontSize: 17, fontWeight: '800', color: colors.text },
  action: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getPlayer } from '@/api/espn';
import { useFetch } from '@/hooks/useFetch';
import { TopTabs } from '@/components/TopTabs';
import { Logo } from '@/components/Logo';
import { NewsCard } from '@/components/NewsCard';
import { Empty, ErrorView, Loading } from '@/components/States';
import { WikiCard } from '@/components/WikiCard';
import { colors, radius } from '@/constants/theme';

const TABS = ['Info', 'Stats', 'News'] as const;
type Tab = (typeof TABS)[number];

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('Info');
  const { data: p, error, loading, retry } = useFetch(() => getPlayer(id), [id]);

  if (loading) return <Loading />;
  if (error || !p) return <ErrorView message={error ?? 'Player not found'} onRetry={retry} />;

  const bio: [string, string | number | undefined][] = [
    ['Position', p.position],
    ['Jersey', p.jersey && `#${p.jersey}`],
    ['Age', p.age],
    ['Date of Birth', p.dob],
    ['Nationality', p.nationality],
    ['Height', p.height],
    ['Weight', p.weight],
  ];

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: p.name }} />
      <View style={styles.header}>
        <View style={styles.photoWrap}>
          {p.headshot ? (
            <Image source={{ uri: p.headshot }} style={styles.photo} contentFit="cover" />
          ) : (
            <Ionicons name="person" size={50} color={colors.textMuted} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{p.name}</Text>
          {p.team && (
            <Pressable style={styles.teamLink} onPress={() => router.push(`/team/${p.team!.id}`)}>
              <Logo uri={p.team.logo} size={18} />
              <Text style={styles.teamName}>{p.team.name}</Text>
            </Pressable>
          )}
          <View style={styles.flagRow}>
            {p.flag && <Image source={{ uri: p.flag }} style={styles.flag} contentFit="contain" />}
            <Text style={styles.sub}>{[p.position, p.nationality].filter(Boolean).join(' • ')}</Text>
          </View>
        </View>
      </View>
      <TopTabs tabs={TABS} active={tab} onChange={setTab} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
        {tab === 'Info' && (
          <>
            {p.summary.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{p.summaryTitle ?? 'Season Stats'}</Text>
                <View style={styles.tiles}>
                  {p.summary.map((s) => (
                    <View key={s.label} style={styles.tile}>
                      <Text style={styles.tileValue}>{s.value}</Text>
                      <Text style={styles.tileLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Personal Info</Text>
              {bio
                .filter(([, v]) => v != null && v !== '')
                .map(([k, v]) => (
                  <View key={k} style={styles.row}>
                    <Text style={styles.rowLabel}>{k}</Text>
                    <Text style={styles.rowValue}>{v}</Text>
                  </View>
                ))}
            </View>
            <WikiCard search={`${p.name} footballer ${p.team?.name ?? ''}`} title="Biography" />
          </>
        )}

        {tab === 'Stats' &&
          (p.seasons.length ? (
            p.seasons.map((s) => (
              <View key={s.name} style={styles.card}>
                <Text style={styles.cardTitle}>{s.name}</Text>
                {s.values.map((v) => (
                  <View key={v.label} style={styles.row}>
                    <Text style={styles.rowLabel}>{v.label}</Text>
                    <Text style={styles.rowValue}>{v.value}</Text>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <Empty message="No stats available for this season" icon="stats-chart-outline" />
          ))}

        {tab === 'News' &&
          (p.news.length ? (
            <View style={{ paddingTop: 10 }}>
              {p.news.map((a) => (
                <NewsCard key={a.id} article={a} />
              ))}
            </View>
          ) : (
            <Empty message="No recent news about this player" icon="newspaper-outline" />
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: colors.primaryDark },
  photoWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.white, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photo: { width: 88, height: 88 },
  name: { color: colors.white, fontSize: 21, fontWeight: '800' },
  teamLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  teamName: { color: colors.white, fontWeight: '600', textDecorationLine: 'underline' },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  flag: { width: 20, height: 14 },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  card: { backgroundColor: colors.card, marginHorizontal: 10, marginTop: 10, borderRadius: radius.md, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexGrow: 1, minWidth: '22%', backgroundColor: colors.bg, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
  tileValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  tileLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { color: colors.textMuted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
});

import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getMatchSummary, getStandings, type Article } from '@/api/espn';
import { getMatchWeather, type WeatherKind } from '@/api/sources';
import { useFetch } from '@/hooks/useFetch';
import { TopTabs } from '@/components/TopTabs';
import { Logo } from '@/components/Logo';
import { EventIcon, LiveDot, eventKind, type EventKind } from '@/components/EventIcon';
import { NewsCard } from '@/components/NewsCard';
import { StandingsTable } from '@/components/StandingsTable';
import { FollowButton } from '@/components/FollowButton';
import { Empty, ErrorView, Loading } from '@/components/States';
import { colors, radius } from '@/constants/theme';
import { formatTime, timeParts } from '@/utils/format';

const TABS = ['Info', 'Commentary', 'Timeline', 'Lineups', 'Stats', 'Table', 'News'] as const;
type Tab = (typeof TABS)[number];

export default function MatchScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const id = params.id;
  // Optional ?tab=Commentary deep link.
  const [tab, setTab] = useState<Tab>(() => TABS.find((t) => t === params.tab) ?? 'Info');

  // Poll every 10s only while the match is in play.
  const { data, error, loading, refreshing, refresh, retry } = useFetch(() => getMatchSummary(id), [id], {
    pollMs: (d) => (d?.header?.competitions?.[0]?.status?.type?.state === 'in' ? 10000 : undefined),
  });

  const comp = data?.header?.competitions?.[0];

  if (loading) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={retry} />;
  if (!comp) return <Empty message="Match not found" />;

  const competitors: any[] = comp.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
  const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
  const league = data.header?.league;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: `${home?.team?.abbreviation ?? ''} vs ${away?.team?.abbreviation ?? ''}`,
          headerRight: () => (
            <FollowButton
              light
              size={22}
              match={{
                id,
                home: home?.team?.shortDisplayName ?? home?.team?.displayName ?? 'Home',
                away: away?.team?.shortDisplayName ?? away?.team?.displayName ?? 'Away',
                kickoff: comp.date,
                state: comp.status?.type?.state ?? 'pre',
                homeScore: home?.score,
                awayScore: away?.score,
                league: league?.name,
              }}
            />
          ),
        }}
      />
      <Scoreboard comp={comp} home={home} away={away} league={league} venue={data.gameInfo?.venue?.fullName} />
      <TopTabs tabs={TABS} active={tab} onChange={setTab} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {tab === 'Info' && <InfoTab data={data} comp={comp} home={home} away={away} />}
        {tab === 'Commentary' && <CommentaryTab data={data} />}
        {tab === 'Timeline' && <TimelineTab data={data} home={home} away={away} />}
        {tab === 'Lineups' && <LineupsTab data={data} />}
        {tab === 'Stats' && <StatsTab data={data} homeId={home?.team?.id} />}
        {tab === 'Table' && <TableTab slug={league?.slug} teamIds={[home?.team?.id, away?.team?.id]} />}
        {tab === 'News' && <NewsTab articles={data.news?.articles ?? []} />}
      </ScrollView>
    </View>
  );
}

// ---------- Header ----------

function Scoreboard({ comp, home, away, league, venue }: { comp: any; home: any; away: any; league?: any; venue?: string }) {
  const type = comp.status?.type ?? {};
  const kickoff = new Date(comp.date);
  const events = (teamId: string) =>
    (comp.details ?? [])
      .filter((d: any) => (d.scoringPlay || d.redCard) && d.team?.id === teamId)
      .map((d: any, i: number) => ({
        key: `${teamId}-${i}`,
        name: d.participants?.[0]?.athlete?.shortName ?? '',
        minute: d.clock?.displayValue ?? '',
        kind: (d.redCard ? 'red' : d.ownGoal ? 'own-goal' : d.penaltyKick ? 'penalty' : 'goal') as EventKind,
      }));

  return (
    <View style={styles.board}>
      {!!league?.name && (
        <Pressable style={styles.boardLeague} onPress={() => league.slug && router.push({ pathname: '/league/[slug]', params: { slug: league.slug, name: league.name, logo: league.logos?.[0]?.href } })}>
          <View style={styles.leagueLogoWrap}>
            <Logo uri={league.logos?.[0]?.href} size={14} />
          </View>
          <Text style={styles.boardLeagueText}>{league.name}</Text>
        </Pressable>
      )}
      <View style={styles.boardRow}>
        <TeamBlock team={home?.team} />
        <View style={styles.boardCenter}>
          {type.state === 'pre' ? (
            <>
              <Text style={styles.kickoff}>
                {timeParts(kickoff).time}
                <Text style={styles.kickoffPeriod}> {timeParts(kickoff).period}</Text>
              </Text>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{kickoff.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.bigScore}>
                {home?.score ?? 0}
                <Text style={styles.scoreDash}> - </Text>
                {away?.score ?? 0}
              </Text>
              {type.state === 'in' ? (
                <View style={[styles.pill, styles.pillLive]}>
                  <LiveDot size={6} color={colors.white} />
                  <Text style={[styles.pillText, { color: colors.white }]}>{comp.status?.displayClock ?? type.shortDetail}</Text>
                </View>
              ) : (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{type.shortDetail ?? 'FT'}</Text>
                </View>
              )}
              {(home?.shootoutScore != null || away?.shootoutScore != null) && (
                <Text style={styles.pens}>
                  Pens {home?.shootoutScore ?? 0} - {away?.shootoutScore ?? 0}
                </Text>
              )}
            </>
          )}
        </View>
        <TeamBlock team={away?.team} />
      </View>

      <View style={styles.scorers}>
        {[home, away].map((side, i) => (
          <View key={i} style={[styles.scorerCol, i === 1 && { alignItems: 'flex-end' }]}>
            {events(side?.team?.id).map((e: any) => (
              <View key={e.key} style={[styles.scorerRow, i === 1 && { flexDirection: 'row-reverse' }]}>
                <EventIcon kind={e.kind} size={13} color={colors.white} />
                <Text style={styles.scorerText} numberOfLines={1}>
                  {e.name} {e.minute}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {!!venue && (
        <View style={styles.boardVenue}>
          <MaterialCommunityIcons name="stadium" size={13} color="rgba(255,255,255,0.6)" />
          <Text style={styles.boardVenueText} numberOfLines={1}>
            {venue}
          </Text>
        </View>
      )}
    </View>
  );
}

function TeamBlock({ team }: { team: any }) {
  return (
    <Pressable style={styles.teamBlock} onPress={() => team?.id && router.push(`/team/${team.id}`)}>
      <View style={styles.teamLogoWrap}>
        <Logo uri={team?.logos?.[0]?.href ?? team?.logo} size={44} />
      </View>
      <Text style={styles.boardTeam} numberOfLines={2}>
        {team?.shortDisplayName ?? team?.displayName}
      </Text>
    </Pressable>
  );
}

// ---------- Info ----------

function InfoRow({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <MaterialCommunityIcons name={icon} size={17} color={colors.primary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function InfoTab({ data, comp, home, away }: { data: any; comp: any; home: any; away: any }) {
  const info = data.gameInfo ?? {};
  const venue = info.venue;
  const city = [venue?.address?.city, venue?.address?.country].filter(Boolean).join(', ');
  const referee = info.officials?.find((o: any) => /referee/i.test(o.position?.displayName ?? o.position?.name ?? ''))?.displayName;
  const d = new Date(comp.date);
  const form: any[] = data.lastFiveGames ?? [];

  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Match Info</Text>
        <InfoRow icon="calendar-month" label="Date" value={d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
        <InfoRow icon="clock-outline" label="Kick-off" value={formatTime(d)} />
        <InfoRow icon="stadium" label="Venue" value={venue?.fullName} />
        <InfoRow icon="map-marker" label="City" value={city} />
        <InfoRow icon="account-group" label="Attendance" value={info.attendance ? Number(info.attendance).toLocaleString() : undefined} />
        <InfoRow icon="whistle" label="Referee" value={referee} />
        <InfoRow icon="television" label="Broadcast" value={comp.broadcasts?.map((b: any) => b.media?.shortName).filter(Boolean).join(', ')} />
      </View>

      {!!venue?.address?.city && comp.status?.type?.state !== 'post' && <WeatherCard city={venue.address.city} kickoff={comp.date} />}

      {form.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Form</Text>
          {[home, away].map((side) => {
            const entry = form.find((f) => f.team?.id === side?.team?.id);
            if (!entry) return null;
            return (
              <View key={side.team.id} style={{ marginBottom: 12 }}>
                <View style={styles.formHead}>
                  <Logo uri={side.team.logos?.[0]?.href} size={20} />
                  <Text style={styles.formTeam}>{side.team.displayName}</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {(entry.events ?? []).slice(0, 5).map((e: any) => (
                      <View key={e.id} style={[styles.formPill, { backgroundColor: formColor(e.gameResult) }]}>
                        <Text style={styles.formPillText}>{e.gameResult}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                {(entry.events ?? []).slice(0, 5).map((e: any) => (
                  <Pressable key={e.id} style={styles.formGame} onPress={() => router.push(`/match/${e.id}`)}>
                    <Text style={styles.formDate}>{new Date(e.gameDate).toLocaleDateString([], { day: 'numeric', month: 'short' })}</Text>
                    <Text style={styles.formOpp} numberOfLines={1}>
                      {e.atVs} {e.opponent?.displayName}
                    </Text>
                    <Text style={styles.formScore}>{e.score}</Text>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const WEATHER_ICON: Record<WeatherKind, keyof typeof MaterialCommunityIcons.glyphMap> = {
  clear: 'weather-sunny',
  'partly-cloudy': 'weather-partly-cloudy',
  cloudy: 'weather-cloudy',
  fog: 'weather-fog',
  drizzle: 'weather-partly-rainy',
  rain: 'weather-rainy',
  snow: 'weather-snowy',
  showers: 'weather-pouring',
  'snow-showers': 'weather-snowy-heavy',
  storm: 'weather-lightning-rainy',
};

/** Kick-off forecast from Open-Meteo; hidden when the city can't be found or the match is too far ahead. */
function WeatherCard({ city, kickoff }: { city: string; kickoff: string }) {
  const { data } = useFetch(() => getMatchWeather(city, kickoff), [city, kickoff]);
  if (!data) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Kick-off Weather</Text>
      <View style={styles.weather}>
        <View style={styles.weatherIconWrap}>
          <MaterialCommunityIcons name={WEATHER_ICON[data.kind]} size={34} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.weatherTemp}>{data.temp}°C</Text>
          <Text style={styles.weatherLabel}>
            {data.label} • {city}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {data.rainChance != null && (
            <View style={styles.weatherStatRow}>
              <MaterialCommunityIcons name="water-percent" size={16} color={colors.textMuted} />
              <Text style={styles.weatherStat}>{data.rainChance}% rain</Text>
            </View>
          )}
          {data.wind != null && (
            <View style={styles.weatherStatRow}>
              <MaterialCommunityIcons name="weather-windy" size={16} color={colors.textMuted} />
              <Text style={styles.weatherStat}>{data.wind} km/h</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const formColor = (r: string) => (r === 'W' ? colors.win : r === 'L' ? colors.loss : colors.draw);

// ---------- Commentary ----------

function CommentaryTab({ data }: { data: any }) {
  const items: any[] = [...(data.commentary ?? [])].reverse();
  if (!items.length) return <Empty message="Live commentary will appear here once the match starts" icon="mic-outline" />;
  return (
    <View style={styles.card}>
      {items.map((c, i) => {
        const kind = eventKind(c.play?.type?.type, c.text);
        const isGoal = kind === 'goal' || kind === 'penalty' || kind === 'own-goal';
        return (
          <View key={`${c.sequence}-${i}`} style={[styles.comm, isGoal && styles.commGoal]}>
            <View style={styles.commLeft}>
              <View style={[styles.minuteBadge, isGoal && styles.minuteBadgeGoal]}>
                <Text style={[styles.minuteText, isGoal && { color: colors.white }]}>{c.time?.displayValue || '–'}</Text>
              </View>
              {kind && kind !== 'whistle' && (
                <View style={{ marginTop: 6 }}>
                  <EventIcon kind={kind} size={15} />
                </View>
              )}
            </View>
            <Text style={[styles.commText, isGoal && { fontWeight: '700' }]}>{c.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------- Timeline ----------

const TIMELINE_TYPES = ['goal', 'yellow-card', 'red-card', 'substitution', 'penalty', 'own-goal'];
const PERIOD_ENDS: Record<string, string> = { halftime: 'HT', 'end-regular-time': 'FT', 'end-extra-time': 'AET', 'full-time': 'FT' };

type TimelineItem =
  | { kind: 'period'; id: string; label: string; score: string }
  | { kind: 'event'; id: string; event: any; isHome: boolean; score?: string };

/** Key events with the running score attached to goals and period markers, newest first. */
function buildTimeline(keyEvents: any[], homeId?: string): TimelineItem[] {
  let h = 0;
  let a = 0;
  const items: TimelineItem[] = [];
  for (const e of keyEvents) {
    const type: string = e.type?.type ?? '';
    const period = Object.keys(PERIOD_ENDS).find((p) => type === p || type.startsWith(p));
    if (period && !e.team) {
      if (!items.some((i) => i.kind === 'period' && i.label === PERIOD_ENDS[period])) {
        items.push({ kind: 'period', id: e.id, label: PERIOD_ENDS[period], score: `${h} - ${a}` });
      }
      continue;
    }
    if (!e.team || !TIMELINE_TYPES.some((t) => type.includes(t))) continue;
    const isHome = e.team.id === homeId;
    let score: string | undefined;
    if (e.scoringPlay && !e.shootout) {
      if (isHome) h++;
      else a++;
      score = `${h} - ${a}`;
    }
    items.push({ kind: 'event', id: e.id, event: e, isHome, score });
  }
  return items.reverse();
}

function TimelineTab({ data, home, away }: { data: any; home: any; away: any }) {
  const items = buildTimeline(data.keyEvents ?? [], home?.team?.id);
  if (!items.length) return <Empty message="Key events will appear here during the match" icon="time-outline" />;
  return (
    <View style={[styles.card, styles.tlCard]}>
      <View style={styles.tlTeams}>
        {[home, away].map((side, i) => (
          <View key={i} style={[styles.tlTeam, i === 1 && { flexDirection: 'row-reverse' }]}>
            <Logo uri={side?.team?.logos?.[0]?.href} size={22} />
            <Text style={styles.tlTeamName} numberOfLines={1}>
              {side?.team?.shortDisplayName ?? side?.team?.displayName}
            </Text>
          </View>
        ))}
      </View>
      <View>
        <View style={styles.tlLine} />
        {items.map((item) =>
          item.kind === 'period' ? (
            <View key={item.id} style={styles.tlPeriod}>
              <Text style={styles.tlPeriodText}>
                {item.label} <Text style={styles.tlPeriodScore}>{item.score}</Text>
              </Text>
            </View>
          ) : (
            <TimelineRow key={item.id} item={item} />
          ),
        )}
      </View>
    </View>
  );
}

function TimelineRow({ item }: { item: Extract<TimelineItem, { kind: 'event' }> }) {
  const e = item.event;
  const type: string = e.type?.type ?? '';
  const isSub = type.includes('substitution');
  const kind = eventKind(type, e.text) ?? 'whistle';
  const names: string[] = (e.participants ?? []).map((p: any) => p.athlete?.displayName).filter(Boolean);
  const isGoal = kind === 'goal' || kind === 'penalty' || kind === 'own-goal';
  const secondary = isSub
    ? names[1]
    : isGoal
      ? [names[1] && `Assist: ${names[1]}`, kind === 'penalty' && 'Penalty', kind === 'own-goal' && 'Own goal'].filter(Boolean).join(' • ')
      : kind === 'yellow' || kind === 'second-yellow'
        ? 'Yellow card'
        : kind === 'red'
          ? 'Red card'
          : undefined;

  const bubble = (
    <View style={[styles.tlBubble, item.isHome ? styles.tlBubbleHome : styles.tlBubbleAway, isGoal && styles.tlBubbleGoal]}>
      <View style={styles.tlIconCol}>
        <EventIcon kind={isSub ? 'sub' : kind} size={16} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <View style={styles.tlNameRow}>
          {isSub && <EventIcon kind="sub-in" size={12} />}
          <Text style={[styles.tlMain, isGoal && { fontWeight: '800' }]} numberOfLines={2}>
            {names[0] ?? e.shortText}
          </Text>
        </View>
        {!!secondary && (
          <View style={styles.tlNameRow}>
            {isSub && <EventIcon kind="sub-out" size={11} />}
            <Text style={styles.tlSub} numberOfLines={2}>
              {secondary}
            </Text>
          </View>
        )}
      </View>
      {!!item.score && (
        <View style={styles.tlScore}>
          <Text style={styles.tlScoreText}>{item.score}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.tlRow}>
      <View style={[styles.tlSide, { alignItems: 'flex-end' }]}>{item.isHome && bubble}</View>
      <View style={styles.tlCenter}>
        <View style={[styles.tlMinute, isGoal && styles.tlMinuteGoal]}>
          <Text style={[styles.tlMinuteText, isGoal && { color: colors.white }]}>{e.clock?.displayValue}</Text>
        </View>
      </View>
      <View style={[styles.tlSide, { alignItems: 'flex-start' }]}>{!item.isHome && bubble}</View>
    </View>
  );
}

// ---------- Lineups ----------

function LineupsTab({ data }: { data: any }) {
  const rosters: any[] = data.rosters ?? [];
  const [index, setIndex] = useState(0);
  const roster = rosters[index];
  if (!roster?.roster?.length) return <Empty message="Lineups are usually announced about an hour before kick-off" icon="people-outline" />;

  const players: any[] = roster.roster;
  const starters = players.filter((p) => p.starter).sort((a, b) => Number(a.formationPlace) - Number(b.formationPlace));
  const subs = players.filter((p) => !p.starter);

  return (
    <View>
      <View style={styles.segment}>
        {rosters.map((r, i) => (
          <Pressable key={r.team?.id ?? i} style={[styles.segmentItem, index === i && styles.segmentActive]} onPress={() => setIndex(i)}>
            <Logo uri={r.team?.logo ?? r.team?.logos?.[0]?.href} size={18} />
            <Text style={[styles.segmentText, index === i && { color: colors.white }]} numberOfLines={1}>
              {r.team?.shortDisplayName ?? r.team?.displayName}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Starting XI {roster.formation ? `• ${roster.formation}` : ''}</Text>
        {starters.map((p) => (
          <PlayerLine key={p.athlete?.id} p={p} />
        ))}
      </View>
      {subs.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Substitutes</Text>
          {subs.map((p) => (
            <PlayerLine key={p.athlete?.id} p={p} />
          ))}
        </View>
      )}
    </View>
  );
}

function PlayerLine({ p }: { p: any }) {
  const stats: any[] = p.stats ?? [];
  const goals = Number(stats.find((s) => s.name === 'totalGoals')?.value ?? 0);
  const yellow = Number(stats.find((s) => s.name === 'yellowCards')?.value ?? 0);
  const red = Number(stats.find((s) => s.name === 'redCards')?.value ?? 0);
  return (
    <Pressable style={styles.playerLine} onPress={() => p.athlete?.id && router.push(`/player/${p.athlete.id}`)}>
      <Text style={styles.jersey}>{p.jersey}</Text>
      <Text style={styles.playerName} numberOfLines={1}>
        {p.athlete?.displayName}
      </Text>
      <View style={styles.playerIcons}>
        {Array.from({ length: goals }, (_, i) => (
          <EventIcon key={`g${i}`} kind="goal" size={14} />
        ))}
        {!!yellow && <EventIcon kind="yellow" size={14} />}
        {!!red && <EventIcon kind="red" size={14} />}
        {p.subbedIn && <EventIcon kind="sub-in" size={14} />}
        {p.subbedOut && <EventIcon kind="sub-out" size={14} />}
      </View>
      <Text style={styles.pos}>{p.position?.abbreviation}</Text>
    </Pressable>
  );
}

// ---------- Stats ----------

const STAT_LABELS: Record<string, string> = {
  possessionPct: 'Possession',
  totalShots: 'Shots',
  shotsOnTarget: 'Shots on Target',
  wonCorners: 'Corners',
  foulsCommitted: 'Fouls',
  offsides: 'Offsides',
  yellowCards: 'Yellow Cards',
  redCards: 'Red Cards',
  saves: 'Saves',
  totalPasses: 'Passes',
  accuratePasses: 'Accurate Passes',
  passPct: 'Pass Accuracy',
  totalCrosses: 'Crosses',
  totalLongBalls: 'Long Balls',
  totalTackles: 'Tackles',
  interceptions: 'Interceptions',
  totalClearance: 'Clearances',
};

// ESPN gives possession as 52.6 and other percentages as 0.7.
const pctValue = (name: string, v: string) => {
  if (!/Pct$/.test(name)) return v;
  const n = Number(v);
  return `${Math.round(n <= 1 ? n * 100 : n)}%`;
};

function StatsTab({ data, homeId }: { data: any; homeId?: string }) {
  const teams: any[] = data.boxscore?.teams ?? [];
  const homeT = teams.find((t) => t.team?.id === homeId) ?? teams[0];
  const awayT = teams.find((t) => t !== homeT);
  if (!homeT?.statistics?.length || !awayT) return <Empty message="Match stats will be available once the match starts" icon="stats-chart-outline" />;

  const awayMap = new Map<string, any>(awayT.statistics.map((s: any) => [s.name, s]));
  const rows = Object.keys(STAT_LABELS)
    .map((name) => ({ name, h: homeT.statistics.find((s: any) => s.name === name), a: awayMap.get(name) }))
    .filter((r) => r.h && r.a);

  return (
    <View style={styles.card}>
      <View style={styles.statHead}>
        <Logo uri={homeT.team?.logo} size={24} />
        <Text style={styles.cardTitle}>Team Stats</Text>
        <Logo uri={awayT.team?.logo} size={24} />
      </View>
      {rows.map(({ name, h, a }) => {
        const hv = Number(h.displayValue) || 0;
        const av = Number(a.displayValue) || 0;
        const total = hv + av || 1;
        return (
          <View key={name} style={styles.statRow}>
            <View style={styles.statLabels}>
              <Text style={[styles.statVal, hv > av && styles.statLead]}>{pctValue(name, h.displayValue)}</Text>
              <Text style={styles.statName}>{STAT_LABELS[name]}</Text>
              <Text style={[styles.statVal, { textAlign: 'right' }, av > hv && styles.statLead]}>{pctValue(name, a.displayValue)}</Text>
            </View>
            <View style={styles.statBars}>
              <View style={[styles.barTrack, { justifyContent: 'flex-end' }]}>
                <View style={[styles.bar, { width: `${(hv / total) * 100}%`, backgroundColor: hv >= av ? colors.primary : '#A7B3CC' }]} />
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { width: `${(av / total) * 100}%`, backgroundColor: av >= hv ? colors.accent : '#FCD9A0' }]} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---------- Table & News ----------

function TableTab({ slug, teamIds }: { slug?: string; teamIds: string[] }) {
  const { data, error, loading } = useFetch(() => getStandings(slug!), [slug], { enabled: !!slug });
  if (!slug) return <Empty message="No table for this competition" icon="list-outline" />;
  if (loading) return <Loading />;
  if (error || !data?.length || !data.some((g) => g.rows.length)) return <Empty message="No table available for this competition" icon="list-outline" />;
  return (
    <View style={{ marginTop: 10 }}>
      <StandingsTable groups={data} highlight={teamIds} />
    </View>
  );
}

function NewsTab({ articles }: { articles: any[] }) {
  if (!articles.length) return <Empty message="No related news yet" icon="newspaper-outline" />;
  const list: Article[] = articles.map((a) => ({
    id: String(a.id),
    headline: a.headline,
    description: a.description,
    image: a.images?.[0]?.url,
    published: a.published,
    source: 'ESPN',
    isVideo: a.type === 'Media',
  }));
  return (
    <View style={{ paddingTop: 10 }}>
      {list.map((a) => (
        <NewsCard key={a.id} article={a} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 14 },
  boardLeague: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 },
  leagueLogoWrap: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  boardLeagueText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  boardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  teamBlock: { flex: 1, alignItems: 'center', gap: 8 },
  teamLogoWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  boardTeam: { color: colors.white, fontWeight: '700', fontSize: 14, textAlign: 'center' },
  boardCenter: { width: 116, alignItems: 'center', gap: 8, paddingTop: 8 },
  bigScore: { color: colors.white, fontSize: 36, fontWeight: '800', letterSpacing: 1 },
  scoreDash: { color: 'rgba(255,255,255,0.5)', fontWeight: '400' },
  kickoff: { color: colors.white, fontSize: 28, fontWeight: '800' },
  kickoffPeriod: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillLive: { backgroundColor: colors.live },
  pillText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '800' },
  pens: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
  scorers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 16 },
  scorerCol: { flex: 1, gap: 4 },
  scorerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scorerText: { flexShrink: 1, color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  boardVenue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12 },
  boardVenueText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  card: { backgroundColor: colors.card, marginHorizontal: 10, marginTop: 10, borderRadius: radius.md, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 12 },
  infoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { width: 82, color: colors.textMuted, fontSize: 14 },
  infoValue: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' },

  weather: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  weatherStatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weatherTemp: { fontSize: 24, fontWeight: '800', color: colors.text },
  weatherLabel: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  weatherStat: { fontSize: 13, color: colors.text },
  formHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  formTeam: { flex: 1, fontWeight: '700', color: colors.text },
  formPill: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  formPillText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  formGame: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingLeft: 28, gap: 8 },
  formDate: { width: 50, fontSize: 12, color: colors.textMuted },
  formOpp: { flex: 1, fontSize: 13, color: colors.text },
  formScore: { fontWeight: '700', fontSize: 13, color: colors.text },

  comm: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 12 },
  commGoal: { backgroundColor: colors.accentSoft, marginHorizontal: -14, paddingHorizontal: 14 },
  commLeft: { width: 44, alignItems: 'center' },
  minuteBadge: { minWidth: 40, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, backgroundColor: colors.tint, alignItems: 'center' },
  minuteBadgeGoal: { backgroundColor: colors.primary },
  minuteText: { fontWeight: '800', color: colors.primary, fontSize: 12 },
  commText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },

  tlCard: { paddingHorizontal: 8, paddingTop: 10 },
  tlTeams: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 10, marginBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tlTeam: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tlTeamName: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: colors.text },
  tlLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, marginLeft: -1, backgroundColor: colors.tint },
  tlRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  tlSide: { flex: 1 },
  tlCenter: { width: 58, alignItems: 'center' },
  tlMinute: { minWidth: 38, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tlMinuteGoal: { backgroundColor: colors.primary, borderColor: colors.primary },
  tlMinuteText: { fontSize: 11, fontWeight: '800', color: colors.text },
  tlBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%', paddingVertical: 7, paddingHorizontal: 9, borderRadius: radius.md, backgroundColor: colors.bg },
  tlBubbleHome: { flexDirection: 'row-reverse', borderTopRightRadius: 4 },
  tlBubbleAway: { borderTopLeftRadius: 4 },
  tlBubbleGoal: { backgroundColor: colors.accentSoft },
  tlIconCol: { width: 18, alignItems: 'center' },
  tlNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tlMain: { flexShrink: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  tlSub: { flexShrink: 1, fontSize: 11, color: colors.textMuted, marginTop: 1 },
  tlScore: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.primary },
  tlScoreText: { fontSize: 11, fontWeight: '800', color: colors.white },
  tlPeriod: { alignSelf: 'center', marginVertical: 8, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.primary },
  tlPeriodText: { fontSize: 12, fontWeight: '800', color: colors.accent, letterSpacing: 0.5 },
  tlPeriodScore: { color: colors.white },

  segment: { flexDirection: 'row', margin: 10, marginBottom: 0, backgroundColor: colors.card, borderRadius: radius.md, padding: 4 },
  segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontWeight: '700', color: colors.text, flexShrink: 1 },
  playerLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  jersey: { width: 26, textAlign: 'center', fontWeight: '800', color: colors.primary },
  playerName: { flex: 1, fontSize: 14, color: colors.text },
  playerIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pos: { width: 42, textAlign: 'right', fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  statHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statRow: { marginBottom: 14 },
  statLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  statVal: { width: 60, fontSize: 14, color: colors.text, fontWeight: '500' },
  statLead: { fontWeight: '800' },
  statName: { flex: 1, textAlign: 'center', fontSize: 13, color: colors.textMuted },
  statBars: { flexDirection: 'row', gap: 6 },
  barTrack: { flex: 1, height: 6, backgroundColor: colors.bg, borderRadius: 3, flexDirection: 'row', overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
});

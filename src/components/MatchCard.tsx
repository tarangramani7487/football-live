import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Match, Side } from '@/api/espn';
import { colors, radius } from '@/constants/theme';
import { timeParts } from '@/utils/format';
import { LiveDot } from './EventIcon';
import { FollowButton } from './FollowButton';
import { Logo } from './Logo';

export function LiveBadge({ label = 'LIVE' }: { label?: string }) {
  return (
    <View style={styles.live}>
      <LiveDot size={6} color={colors.white} />
      <Text style={styles.liveText}>{label}</Text>
    </View>
  );
}

const formatDay = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

const isLoser = (side: Side, match: Match) => match.state === 'post' && side.winner === false && !!(match.home.winner || match.away.winner);

function TeamRow({ side, match, size = 22 }: { side: Side; match: Match; size?: number }) {
  const lost = isLoser(side, match);
  const won = match.state === 'post' && side.winner;
  return (
    <View style={styles.teamRow}>
      <Logo uri={side.logo} size={size} />
      <Text style={[styles.teamName, won && styles.bold, lost && styles.dim]} numberOfLines={1}>
        {side.name}
      </Text>
      {match.state !== 'pre' && (
        <Text style={[styles.score, match.state === 'in' && { color: colors.live }, lost && styles.dim]}>{side.score ?? '-'}</Text>
      )}
    </View>
  );
}

/** Left column: kick-off time + date, live minute, or FT + date. */
function StatusColumn({ match }: { match: Match }) {
  if (match.state === 'in') {
    return (
      <View style={styles.statusCol}>
        <View style={styles.liveRow}>
          <LiveDot size={6} />
          <Text style={styles.liveLabel}>LIVE</Text>
        </View>
        <Text style={[styles.statusMain, { color: colors.live }]}>{match.status}</Text>
      </View>
    );
  }
  const pre = match.state === 'pre' ? timeParts(match.date) : null;
  return (
    <View style={styles.statusCol}>
      {pre ? (
        <Text style={styles.statusMain} numberOfLines={1}>
          {pre.time}
          <Text style={styles.period}> {pre.period}</Text>
        </Text>
      ) : (
        <Text style={[styles.statusMain, { color: colors.textMuted }]}>{match.status}</Text>
      )}
      <Text style={styles.statusSub}>{formatDay(match.date)}</Text>
    </View>
  );
}

/** Where a card sits in a league group: joined cards share one rounded block with dividers between rows. */
export type CardPosition = { first: boolean; last: boolean };

/** Full-width match row used in lists. */
export function MatchCard({ match, showLeague, joined }: { match: Match; showLeague?: boolean; joined?: CardPosition }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        joined && styles.joined,
        joined?.first && styles.joinedFirst,
        joined?.last && styles.joinedLast,
        joined && !joined.last && styles.joinedDivider,
        match.state === 'in' && styles.cardLive,
        pressed && styles.pressed,
      ]}
      onPress={() => router.push(`/match/${match.id}`)}
    >
      {!!match.leagueName && showLeague && (
        <View style={styles.leagueLine}>
          <Logo uri={match.leagueLogo} size={14} />
          <Text style={styles.leagueTag} numberOfLines={1}>
            {match.leagueName}
          </Text>
        </View>
      )}
      <View style={styles.body}>
        <StatusColumn match={match} />
        <View style={styles.teams}>
          <TeamRow side={match.home} match={match} />
          <TeamRow side={match.away} match={match} />
        </View>
        {match.state !== 'post' && (
          <View style={styles.bell}>
            <FollowButton
              size={18}
              match={{
                id: match.id,
                home: match.home.short,
                away: match.away.short,
                kickoff: match.date,
                state: match.state,
                homeScore: match.home.score,
                awayScore: match.away.score,
                league: match.leagueName,
              }}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** Compact card for the horizontal rows on Home. */
export function MiniMatchCard({ match }: { match: Match }) {
  return (
    <Pressable style={({ pressed }) => [styles.mini, pressed && styles.pressed]} onPress={() => router.push(`/match/${match.id}`)}>
      <View style={styles.miniHead}>
        <Logo uri={match.leagueLogo} size={14} />
        <Text style={styles.miniLeague} numberOfLines={1}>
          {match.leagueName}
        </Text>
        {match.state === 'in' ? (
          <LiveBadge label={match.status} />
        ) : (
          <Text style={[styles.miniChip, match.state === 'pre' && styles.miniChipPre]}>{match.status}</Text>
        )}
      </View>
      <TeamRow side={match.home} match={match} size={20} />
      <TeamRow side={match.away} match={match} size={20} />
      {match.state !== 'in' && <Text style={styles.miniDate}>{formatDay(match.date)}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  joined: { marginTop: 0, borderRadius: 0 },
  joinedFirst: { marginTop: 6, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
  joinedLast: { borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md },
  joinedDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  cardLive: { borderLeftColor: colors.live },
  pressed: { opacity: 0.7 },
  body: { flexDirection: 'row', alignItems: 'center' },
  statusCol: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 10,
    marginRight: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    gap: 3,
  },
  statusMain: { fontSize: 14, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  period: { fontSize: 10, fontWeight: '800' },
  statusSub: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveLabel: { fontSize: 10, fontWeight: '800', color: colors.live, letterSpacing: 0.5 },
  teams: { flex: 1, gap: 2 },
  bell: { marginLeft: 8, paddingLeft: 8, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 10 },
  teamName: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  bold: { fontWeight: '700' },
  score: { fontSize: 17, fontWeight: '800', color: colors.text, minWidth: 20, textAlign: 'right' },
  dim: { color: colors.textMuted, fontWeight: '400' },
  leagueLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  leagueTag: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  live: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.live, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, gap: 4 },
  liveText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  mini: {
    width: 240,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginRight: 10,
  },
  miniHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  miniLeague: { flex: 1, fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  miniChip: { fontSize: 11, fontWeight: '800', color: colors.textMuted, backgroundColor: colors.bg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  miniChipPre: { color: colors.primary, backgroundColor: colors.tint },
  miniDate: { marginTop: 4, fontSize: 11, color: colors.textMuted },
});

// Free, key-less ESPN public endpoints. They are unofficial, so every field is
// treated as optional and normalised here before reaching the UI.
import { LEAGUES, TOP_NEWS_LEAGUES, getLeague } from '@/constants/leagues';
import { formatTime } from '@/utils/format';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/soccer';
const ATHLETES = 'https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes';
const CONTENT = 'https://content.core.api.espn.com/v1/sports/news';

/** `live` skips the phone's HTTP cache so scores are never served stale. */
async function get<T = any>(url: string, live = false): Promise<T> {
  const res = await fetch(url, live ? { cache: 'no-store' } : undefined);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

// ---------- Types ----------

export type MatchState = 'pre' | 'in' | 'post';

export type Side = {
  id: string;
  name: string;
  short: string;
  abbr: string;
  logo?: string;
  score?: string;
  winner?: boolean;
};

export type Match = {
  id: string;
  date: string;
  state: MatchState;
  status: string; // "FT", "HT", "67'", "Sat, Oct 31st at 8:30 AM"
  home: Side;
  away: Side;
  venue?: string;
  leagueSlug?: string;
  leagueName?: string;
  leagueLogo?: string;
  note?: string;
};

export type LeagueMatches = { slug: string; name: string; logo?: string; matches: Match[] };

type LeagueRef = { slug?: string; name?: string; logo?: string };

export type Article = {
  id: string;
  headline: string;
  description?: string;
  image?: string;
  published?: string;
  byline?: string;
  url?: string;
  /** Publisher name; ESPN stories open in the native reader, others in the browser. */
  source?: string;
  isVideo?: boolean;
};

export type StandingRow = {
  rank: number;
  teamId: string;
  team: string;
  abbr: string;
  logo?: string;
  played: string;
  won: string;
  drawn: string;
  lost: string;
  gd: string;
  points: string;
  note?: { color: string; description: string };
};

export type StandingGroup = { name: string; rows: StandingRow[] };

// ---------- Helpers ----------

export const dateKey = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

const teamLogo = (team: any): string | undefined =>
  team?.logo ?? team?.logos?.[0]?.href ?? (team?.id ? `https://a.espncdn.com/i/teamlogos/soccer/500/${team.id}.png` : undefined);

const scoreOf = (score: any): string | undefined =>
  score == null ? undefined : typeof score === 'object' ? score.displayValue : String(score);

function toSide(c: any): Side {
  const t = c?.team ?? {};
  return {
    id: String(t.id ?? ''),
    name: t.displayName ?? t.name ?? 'TBD',
    short: t.shortDisplayName ?? t.displayName ?? 'TBD',
    abbr: t.abbreviation ?? '',
    logo: teamLogo(t),
    score: scoreOf(c?.score),
    winner: c?.winner,
  };
}

function statusText(status: any, date: string): string {
  const type = status?.type ?? {};
  if (type.state === 'pre') {
    return formatTime(date);
  }
  if (type.state === 'in') return type.shortDetail || status?.displayClock || 'LIVE';
  return type.shortDetail || 'FT';
}

export function toMatch(event: any, league?: LeagueRef): Match {
  const comp = event?.competitions?.[0] ?? {};
  const competitors: any[] = comp.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
  const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
  const status = comp.status ?? event?.status;
  return {
    id: String(event.id),
    date: event.date,
    state: status?.type?.state ?? 'pre',
    status: statusText(status, event.date),
    home: toSide(home),
    away: toSide(away),
    venue: comp.venue?.fullName ?? event?.venue?.displayName,
    leagueSlug: league?.slug,
    leagueName: league?.name ?? event?.league?.name,
    leagueLogo: league?.logo ?? (league?.slug ? getLeague(league.slug)?.logo : undefined),
    note: comp.notes?.[0]?.headline ?? comp.altGameNote,
  };
}

function toArticle(a: any): Article {
  return {
    id: String(a.id ?? a.dataSourceIdentifier ?? a.headline),
    headline: a.headline,
    description: a.description,
    image: a.images?.[0]?.url,
    published: a.published,
    byline: a.byline,
    url: a.links?.web?.href,
    source: 'ESPN',
    isVideo: a.type === 'Media',
  };
}

// ---------- Matches ----------

export async function getLeagueScoreboard(slug: string, date?: Date): Promise<Match[]> {
  const q = date ? `?dates=${dateKey(date)}` : '';
  const data = await get(`${SITE}/${slug}/scoreboard${q}`, true);
  const name = getLeague(slug)?.name ?? data?.leagues?.[0]?.name;
  return (data?.events ?? []).map((e: any) => toMatch(e, { slug, name }));
}

/** Matches across every configured league for a day, grouped by league. */
export async function getAllScoreboards(date?: Date): Promise<LeagueMatches[]> {
  const results = await Promise.allSettled(LEAGUES.map((l) => getLeagueScoreboard(l.slug, date)));
  const sections = LEAGUES.map((l, i) => {
    const r = results[i];
    return { slug: l.slug, name: l.name, logo: l.logo, matches: r.status === 'fulfilled' ? r.value : [] };
  }).filter((s) => s.matches.length > 0);
  if (sections.length === 0 && results.every((r) => r.status === 'rejected')) {
    throw new Error('Could not load matches. Check your connection.');
  }
  return sections;
}

// ---------- Live / Recent / Upcoming ----------

export type MatchDay = { day: string; date: Date; sections: LeagueMatches[] };
export type MatchWindow = 'live' | 'recent' | 'upcoming';

const LEAGUE_ORDER = new Map(LEAGUES.map((l, i) => [l.slug, i]));
const DAY_MS = 86400000;
const MONTH_TTL = 5 * 60 * 1000;

// One league's fixtures for a whole month in one request (`dates=YYYYMM`), cached so the
// Recent/Upcoming tabs and Home share the same downloads.
const monthCache = new Map<string, { at: number; data: Promise<Match[]> }>();

function getLeagueMonth(slug: string, year: number, month: number): Promise<Match[]> {
  const key = `${slug}:${year}${String(month + 1).padStart(2, '0')}`;
  const hit = monthCache.get(key);
  if (hit && Date.now() - hit.at < MONTH_TTL) return hit.data;
  const name = getLeague(slug)?.name;
  const data = get(`${SITE}/${slug}/scoreboard?dates=${key.split(':')[1]}&limit=500`).then((d) =>
    (d?.events ?? []).map((e: any) => toMatch(e, { slug, name })),
  );
  data.catch(() => monthCache.delete(key));
  monthCache.set(key, { at: Date.now(), data });
  return data;
}

/** Forget cached months, e.g. on pull-to-refresh. */
export const clearMatchCache = () => monthCache.clear();

function groupByDay(matches: Match[], newestFirst: boolean): MatchDay[] {
  const days = new Map<string, Match[]>();
  for (const m of matches) {
    const key = new Date(m.date).toDateString();
    days.set(key, [...(days.get(key) ?? []), m]);
  }
  return [...days]
    .map(([day, list]) => {
      const leagues = new Map<string, Match[]>();
      for (const m of list) leagues.set(m.leagueSlug!, [...(leagues.get(m.leagueSlug!) ?? []), m]);
      const sections = [...leagues]
        .sort(([a, am], [b, bm]) => (LEAGUE_ORDER.get(a) ?? 99) - (LEAGUE_ORDER.get(b) ?? 99) || (am[0].leagueName ?? '').localeCompare(bm[0].leagueName ?? ''))
        .map(([slug, ms]) => ({
          slug,
          name: ms[0].leagueName ?? slug,
          logo: ms[0].leagueLogo,
          matches: ms.sort((a, b) => a.date.localeCompare(b.date)),
        }));
      return { day, date: new Date(day), sections };
    })
    .sort((a, b) => (newestFirst ? b.date.getTime() - a.date.getTime() : a.date.getTime() - b.date.getTime()));
}

/** Months (year, 0-based month) touched by [from, to], padded a day each side for time zones. */
function monthsBetween(from: number, to: number) {
  const out: [number, number][] = [];
  const d = new Date(from - DAY_MS);
  d.setDate(1);
  while (d.getTime() <= to + DAY_MS) {
    out.push([d.getFullYear(), d.getMonth()]);
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

// League id → name/logo. Seeded with our leagues; others are learned from a match summary once and cached.
const leagueInfo = new Map<string, Promise<LeagueRef>>(LEAGUES.map((l) => [l.id, Promise.resolve({ slug: l.slug, name: l.name, logo: l.logo })]));

function resolveLeague(leagueId: string, eventId: string): Promise<LeagueRef> {
  let info = leagueInfo.get(leagueId);
  if (!info) {
    info = getMatchSummary(eventId).then((d) => {
      const l = d?.header?.league ?? {};
      return { slug: l.slug, name: l.name, logo: l.logos?.[0]?.href };
    });
    info.catch(() => leagueInfo.delete(leagueId));
    leagueInfo.set(leagueId, info);
  }
  return info.catch(() => ({}));
}

/** Matches in play right now in every league ESPN covers (not only the leagues listed in the app). */
async function getLiveEverywhere(): Promise<Match[]> {
  const data = await get(`${SITE}/all/scoreboard?limit=1000`, true);
  const live: any[] = (data?.events ?? []).filter((e: any) => e?.status?.type?.state === 'in');
  return Promise.all(
    live.map(async (e) => {
      const leagueId = String(e.uid ?? '').match(/~l:(\d+)/)?.[1];
      const league = leagueId ? await resolveLeague(leagueId, String(e.id)) : {};
      return toMatch(e, league);
    }),
  );
}

/**
 * Live matches, recent results (last `days` days, newest first) or upcoming fixtures (next `days` days),
 * grouped by the phone's local day and then by league.
 */
export async function getMatchWindow(kind: MatchWindow, days = 14): Promise<MatchDay[]> {
  if (kind === 'live') return groupByDay(await getLiveEverywhere(), false);

  const today = new Date(new Date().toDateString()).getTime();
  const [from, to] = kind === 'recent' ? [today - (days - 1) * DAY_MS, today + DAY_MS] : [today, today + days * DAY_MS];
  const requests = monthsBetween(from, to).flatMap(([y, m]) => LEAGUES.map((l) => getLeagueMonth(l.slug, y, m)));
  const results = await Promise.allSettled(requests);
  if (results.every((r) => r.status === 'rejected')) throw new Error('Could not load matches. Check your connection.');

  const seen = new Set<string>();
  const matches = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
    .filter((m) => {
      const t = new Date(m.date).getTime();
      if (t < from || t >= to) return false;
      return kind === 'recent' ? m.state === 'post' : m.state === 'pre';
    });
  return groupByDay(matches, kind === 'recent');
}

export const getMatchSummary = (eventId: string) => get(`${SITE}/all/summary?event=${eventId}`, true);

// ---------- News ----------

export async function getNews(slug?: string, limit = 30): Promise<Article[]> {
  if (slug) {
    const data = await get(`${SITE}/${slug}/news?limit=${limit}`);
    return (data?.articles ?? []).map(toArticle);
  }
  // No global soccer feed exists, so merge the top leagues and de-duplicate.
  const lists = await Promise.allSettled(TOP_NEWS_LEAGUES.map((s) => getNews(s, 15)));
  const seen = new Set<string>();
  return lists
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => (b.published ?? '').localeCompare(a.published ?? ''))
    .slice(0, limit);
}

export async function getTeamNews(teamId: string): Promise<Article[]> {
  const data = await get(`${SITE}/all/news?team=${teamId}&limit=25`);
  return (data?.articles ?? []).map(toArticle);
}

export type ArticleDetail = Article & {
  paragraphs: string[];
  related: { type: 'team' | 'athlete' | 'league'; id: string; name: string }[];
};

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

/** Turns ESPN story HTML into plain paragraphs. */
function storyToParagraphs(html: string): string[] {
  return html
    .replace(/<photo[^>]*>.*?<\/photo>|<photo[^>]*\/?>|<video[^>]*>.*?<\/video>|<video[^>]*\/?>/gis, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/<\/p>|<\/h\d>|<\/li>/i)
    .map((p) => decode(p.replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim())
    .filter((p) => p.length > 0);
}

export async function getArticle(id: string): Promise<ArticleDetail> {
  const data = await get(`${CONTENT}/${id}`);
  const h = data?.headlines?.[0];
  if (!h) throw new Error('Article not found');
  const related: ArticleDetail['related'] = [];
  for (const c of h.categories ?? []) {
    if (c.type === 'team' && c.teamId) related.push({ type: 'team', id: String(c.teamId), name: c.description });
    if (c.type === 'athlete' && c.athleteId) related.push({ type: 'athlete', id: String(c.athleteId), name: c.description });
  }
  return { ...toArticle(h), paragraphs: storyToParagraphs(h.story ?? ''), related };
}

// ---------- Videos ----------

export type VideoClip = { id: string; title: string; description?: string; thumbnail?: string; duration?: number; url: string; published?: string };

/** Video clips from the top leagues' ESPN feeds (press conferences, analysis, highlights). */
export async function getVideos(slug?: string): Promise<Article[]> {
  const slugs = slug ? [slug] : TOP_NEWS_LEAGUES;
  const lists = await Promise.allSettled(slugs.map((s) => get(`${SITE}/${s}/news?limit=50`)));
  const seen = new Set<string>();
  return lists
    .flatMap((r) => (r.status === 'fulfilled' ? (r.value?.articles ?? []) : []))
    .filter((a: any) => a.type === 'Media')
    .map(toArticle)
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => (b.published ?? '').localeCompare(a.published ?? ''));
}

export async function getVideo(id: string): Promise<VideoClip> {
  const data = await get(`${CONTENT}/${id}`);
  const h = data?.headlines?.[0];
  const v = h?.video?.[0];
  const src = v?.links?.source;
  const url = src?.HD?.href ?? src?.href ?? src?.full?.href;
  if (!url) throw new Error('Video not available');
  return {
    id,
    title: v.headline ?? h.headline,
    description: v.description ?? h.description,
    thumbnail: v.thumbnail ?? h.images?.[0]?.url,
    duration: v.duration,
    url,
    published: h.published,
  };
}

// ---------- Standings ----------

const stat = (stats: any[], name: string) => stats?.find((s) => s.name === name)?.displayValue ?? '-';

export async function getStandings(slug: string): Promise<StandingGroup[]> {
  const data = await get(`${STANDINGS}/${slug}/standings`);
  const groups: any[] = data?.children?.length ? data.children : data?.standings ? [data] : [];
  return groups.map((g) => ({
    name: g.name ?? g.abbreviation ?? '',
    rows: (g.standings?.entries ?? [])
      .map((e: any) => ({
        rank: Number(stat(e.stats, 'rank')) || 0,
        teamId: String(e.team?.id),
        team: e.team?.displayName,
        abbr: e.team?.abbreviation,
        logo: teamLogo(e.team),
        played: stat(e.stats, 'gamesPlayed'),
        won: stat(e.stats, 'wins'),
        drawn: stat(e.stats, 'ties'),
        lost: stat(e.stats, 'losses'),
        gd: stat(e.stats, 'pointDifferential'),
        points: stat(e.stats, 'points'),
        note: e.note,
      }))
      .sort((a: StandingRow, b: StandingRow) => a.rank - b.rank),
  }));
}

// ---------- League leaders ----------

export type Leader = {
  rank: number;
  playerId: string;
  name: string;
  teamId?: string;
  team?: string;
  teamLogo?: string;
  value: number;
  apps?: string;
};

export type LeaderBoard = { key: string; title: string; leaders: Leader[] };

/** Top scorers and top assists for a competition's current season. */
export async function getLeagueLeaders(slug: string): Promise<LeaderBoard[]> {
  const data = await get(`${SITE}/${slug}/statistics`);
  return (data?.stats ?? []).map((c: any) => ({
    key: c.name,
    title: c.displayName,
    leaders: (c.leaders ?? []).map((l: any, i: number) => {
      const a = l.athlete ?? {};
      return {
        rank: i + 1,
        playerId: String(a.id),
        name: a.displayName,
        teamId: a.team?.id ? String(a.team.id) : undefined,
        team: a.team?.displayName,
        teamLogo: teamLogo(a.team),
        value: Number(l.value) || 0,
        apps: a.statistics?.find((s: any) => s.name === 'appearances')?.displayValue,
      };
    }),
  }));
}

// ---------- Teams ----------

export type TeamInfo = {
  id: string;
  name: string;
  logo?: string;
  color?: string;
  leagueSlug?: string;
  leagueName?: string;
  standing?: string;
  record?: string;
  venue?: string;
};

export async function getTeam(teamId: string): Promise<TeamInfo> {
  const data = await get(`${SITE}/all/teams/${teamId}`);
  const t = data?.team ?? {};
  return {
    id: String(t.id ?? teamId),
    name: t.displayName ?? 'Team',
    logo: teamLogo(t),
    color: t.color ? `#${t.color}` : undefined,
    leagueSlug: t.defaultLeague?.slug,
    leagueName: t.defaultLeague?.name,
    standing: t.standingSummary,
    record: t.record?.items?.[0]?.summary,
    venue: t.venue?.fullName,
  };
}

export async function getLeagueTeams(slug: string) {
  const data = await get(`${SITE}/${slug}/teams`);
  const teams: any[] = data?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return teams
    .map(({ team }) => ({ id: String(team.id), name: team.displayName as string, logo: teamLogo(team) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTeamSchedule(teamId: string, fixtures: boolean): Promise<Match[]> {
  const data = await get(`${SITE}/all/teams/${teamId}/schedule${fixtures ? '?fixture=true' : ''}`);
  const events: any[] = data?.events ?? [];
  const matches = events.map((e) => toMatch(e, { name: e.league?.name ?? e.seasonType?.name }));
  return fixtures ? matches : matches.reverse();
}

export type SquadPlayer = {
  id: string;
  name: string;
  jersey?: string;
  position: string;
  age?: number;
  nationality?: string;
  headshot?: string;
};

export async function getTeamSquad(leagueSlug: string, teamId: string): Promise<SquadPlayer[]> {
  const data = await get(`${SITE}/${leagueSlug}/teams/${teamId}/roster`);
  return (data?.athletes ?? []).map((a: any) => ({
    id: String(a.id),
    name: a.displayName,
    jersey: a.jersey,
    position: a.position?.displayName ?? 'Unknown',
    age: a.age,
    nationality: a.citizenship,
    headshot: a.headshot?.href,
  }));
}

// ---------- Players ----------

export type PlayerProfile = {
  id: string;
  name: string;
  headshot?: string;
  team?: { id: string; name: string; logo?: string };
  position?: string;
  jersey?: string;
  age?: number;
  dob?: string;
  height?: string;
  weight?: string;
  nationality?: string;
  flag?: string;
  summaryTitle?: string;
  summary: { label: string; value: string }[];
  seasons: { name: string; values: { label: string; value: string }[] }[];
  news: Article[];
};

export async function getPlayer(id: string): Promise<PlayerProfile> {
  const [bio, overview] = await Promise.all([
    get(`${ATHLETES}/${id}`),
    get(`${ATHLETES}/${id}/overview`).catch(() => ({})),
  ]);
  const a = bio?.athlete ?? {};
  const st = (overview as any)?.statistics ?? {};
  const labels: string[] = st.displayNames ?? st.labels ?? [];
  return {
    id,
    name: a.displayName ?? 'Player',
    headshot: a.headshot?.href,
    team: a.team ? { id: String(a.team.id), name: a.team.displayName, logo: teamLogo(a.team) } : undefined,
    position: a.position?.displayName,
    jersey: a.jersey ?? a.displayJersey,
    age: a.age,
    dob: a.displayDOB,
    height: a.displayHeight,
    weight: a.displayWeight,
    nationality: a.citizenship,
    flag: a.flag?.href,
    summaryTitle: a.statsSummary?.displayName,
    summary: (a.statsSummary?.statistics ?? []).map((s: any) => ({ label: s.displayName, value: s.displayValue })),
    seasons: (st.splits ?? []).map((sp: any) => ({
      name: sp.displayName,
      values: (sp.stats ?? []).map((v: string, i: number) => ({ label: labels[i] ?? '', value: v })),
    })),
    news: ((overview as any)?.news ?? []).map(toArticle),
  };
}

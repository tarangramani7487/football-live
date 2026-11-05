// Extra free data sources (no API keys): public RSS news feeds, Wikipedia and Open-Meteo.
import { Platform } from 'react-native';
import type { Article } from './espn';
import { RSS_SOURCES, type NewsSource } from './feeds';

export { RSS_SOURCES, type NewsSource };

async function getText(url: string, headers?: Record<string, string>) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.text();
}

// ---------- RSS news ----------

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

/** Text content of a tag: unwraps CDATA, decodes entities (twice, for escaped HTML) and strips markup. */
function tagText(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  if (!m) return undefined;
  const raw = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return decode(decode(raw).replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

const attrs = (xml: string, name: string, attr: string) =>
  [...xml.matchAll(new RegExp(`<${name}\\s[^>]*?${attr}="([^"]+)"`, 'g'))].map((m) => decode(m[1]));

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const ZONES: Record<string, number> = { GMT: 0, UTC: 0, Z: 0, BST: 60, EST: -300, EDT: -240, CST: -360, CDT: -300, PST: -480, PDT: -420 };

/** Parses RFC 822 dates ("Sat, 31 Oct 2026 06:23:58 GMT") without relying on engine-specific Date parsing. */
export function parseRssDate(s?: string): string | undefined {
  const m = s?.match(/(\d{1,2})\s+(\w{3})\w*\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s*([+-]\d{4}|[A-Z]{1,4})?/);
  if (!m) return undefined;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return undefined;
  let offset = 0;
  const zone = m[7] ?? 'GMT';
  if (/^[+-]\d{4}$/.test(zone)) offset = (zone[0] === '-' ? -1 : 1) * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3)));
  else offset = ZONES[zone] ?? 0;
  const utc = Date.UTC(Number(m[3]), month, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0)) - offset * 60000;
  return new Date(utc).toISOString();
}

function rssImage(item: string): string | undefined {
  const thumb = attrs(item, 'media:thumbnail', 'url')[0];
  if (thumb) return thumb.replace('/standard/240/', '/standard/480/'); // BBC serves larger sizes on the same path
  const content = attrs(item, 'media:content', 'url');
  if (content.length) return content[content.length - 1]; // Guardian lists sizes small → large
  return attrs(item, 'enclosure', 'url')[0];
}

export async function getRssNews(source: NewsSource, limit = 25): Promise<Article[]> {
  // Browsers block these feeds (no CORS headers), so on web go through our own /rss route.
  const xml = await getText(Platform.OS === 'web' ? `/rss?source=${source.id}` : source.url);
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, limit).map((item) => {
    const url = tagText(item, 'link');
    return {
      id: `${source.id}:${tagText(item, 'guid') ?? url}`,
      headline: tagText(item, 'title') ?? '',
      description: tagText(item, 'description'),
      image: rssImage(item),
      published: parseRssDate(tagText(item, 'pubDate')),
      byline: tagText(item, 'dc:creator'),
      url,
      source: source.name,
    };
  });
}

// ---------- Wikipedia ----------

export type WikiSummary = { title: string; description?: string; extract: string; image?: string; url: string };

const WIKI = 'https://en.wikipedia.org';
const WIKI_HEADERS = { 'Api-User-Agent': 'FootballLive/1.0 (Expo app)' };

/**
 * Finds the best Wikipedia page for a search and returns its summary.
 * Results that aren't about football are dropped so we never show the wrong person or club.
 */
export async function getWikiSummary(search: string): Promise<WikiSummary | null> {
  const q = encodeURIComponent(search);
  const found = JSON.parse(await getText(`${WIKI}/w/api.php?action=query&list=search&srsearch=${q}&srlimit=1&format=json&origin=*`, WIKI_HEADERS));
  const title: string | undefined = found?.query?.search?.[0]?.title;
  if (!title) return null;
  const s = JSON.parse(await getText(`${WIKI}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, WIKI_HEADERS));
  const about = `${s.description ?? ''} ${s.extract ?? ''}`.toLowerCase();
  if (s.type === 'disambiguation' || !/football|soccer/.test(about)) return null;
  return {
    title: s.title,
    description: s.description,
    extract: s.extract,
    image: s.thumbnail?.source ?? s.originalimage?.source,
    url: s.content_urls?.mobile?.page ?? `${WIKI}/wiki/${encodeURIComponent(title)}`,
  };
}

// ---------- Weather (Open-Meteo) ----------

export type WeatherKind = 'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'showers' | 'snow-showers' | 'storm';
export type MatchWeather = { temp: number; rainChance?: number; wind?: number; label: string; kind: WeatherKind };

// WMO weather codes → label + kind (the UI picks the icon).
function describe(code: number): { label: string; kind: WeatherKind } {
  if (code === 0) return { label: 'Clear sky', kind: 'clear' };
  if (code <= 2) return { label: 'Partly cloudy', kind: 'partly-cloudy' };
  if (code === 3) return { label: 'Overcast', kind: 'cloudy' };
  if (code <= 48) return { label: 'Fog', kind: 'fog' };
  if (code <= 57) return { label: 'Drizzle', kind: 'drizzle' };
  if (code <= 67) return { label: 'Rain', kind: 'rain' };
  if (code <= 77) return { label: 'Snow', kind: 'snow' };
  if (code <= 82) return { label: 'Rain showers', kind: 'showers' };
  if (code <= 86) return { label: 'Snow showers', kind: 'snow-showers' };
  return { label: 'Thunderstorm', kind: 'storm' };
}

/** Forecast for the venue city at kick-off. Open-Meteo forecasts up to 16 days ahead. */
export async function getMatchWeather(city: string, kickoffIso: string): Promise<MatchWeather | null> {
  const geo = JSON.parse(await getText(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`));
  const place = geo?.results?.[0];
  if (!place) return null;
  const f = JSON.parse(
    await getText(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
        '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&forecast_days=16&timezone=UTC',
    ),
  );
  const times: string[] = f?.hourly?.time ?? [];
  const kickoff = new Date(kickoffIso).getTime();
  let best = -1;
  times.forEach((t, i) => {
    const d = Math.abs(new Date(`${t}:00Z`).getTime() - kickoff);
    if (d <= 3600000 && (best < 0 || d < Math.abs(new Date(`${times[best]}:00Z`).getTime() - kickoff))) best = i;
  });
  if (best < 0) return null;
  const h = f.hourly;
  return {
    temp: Math.round(h.temperature_2m[best]),
    rainChance: h.precipitation_probability?.[best] ?? undefined,
    wind: h.wind_speed_10m?.[best] != null ? Math.round(h.wind_speed_10m[best]) : undefined,
    ...describe(h.weather_code[best]),
  };
}

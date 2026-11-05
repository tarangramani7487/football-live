// Combines ESPN with the free RSS publishers into a single news feed.
import { getNews, type Article } from './espn';
import { RSS_SOURCES, getRssNews } from './sources';

export type Feed = { id: string; label: string };

export const FEEDS: Feed[] = [
  { id: 'top', label: 'Top Stories' },
  { id: 'espn', label: 'ESPN' },
  ...RSS_SOURCES.map((s) => ({ id: s.id, label: s.name })),
];

const byDate = (a: Article, b: Article) => (b.published ?? '').localeCompare(a.published ?? '');

/** Interleaves sources so one publisher doesn't fill the whole top of the feed. */
function interleave(lists: Article[][], limit: number): Article[] {
  const sorted = lists.map((l) => [...l].sort(byDate));
  const out: Article[] = [];
  for (let i = 0; out.length < limit && sorted.some((l) => i < l.length); i++) {
    for (const l of sorted) if (l[i] && out.length < limit) out.push(l[i]);
  }
  return out;
}

export async function getFeed(id: string, limit = 40): Promise<Article[]> {
  if (id === 'espn') return getNews(undefined, limit);
  const rss = RSS_SOURCES.find((s) => s.id === id);
  if (rss) return getRssNews(rss, limit);

  // "Top": a mix of every publisher, newest first within each round.
  const lists = await Promise.allSettled([getNews(undefined, 15), ...RSS_SOURCES.map((s) => getRssNews(s, 15))]);
  const ok = lists.flatMap((r) => (r.status === 'fulfilled' ? [r.value.filter((a) => !a.isVideo)] : []));
  if (!ok.length) throw new Error('Could not load news. Check your connection.');
  return interleave(ok, limit);
}

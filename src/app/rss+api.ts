// Web-only helper: browsers block the RSS feeds (no CORS headers), so the web app fetches them through this route.
// Only the feeds listed in RSS_SOURCES can be requested, so this is not an open proxy.
import { RSS_SOURCES } from '@/api/feeds';

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('source');
  const feed = RSS_SOURCES.find((s) => s.id === id);
  if (!feed) return Response.json({ error: 'Unknown feed' }, { status: 400 });

  const upstream = await fetch(feed.url, { headers: { 'User-Agent': 'FootballLive/1.0' } });
  if (!upstream.ok) return Response.json({ error: `Feed returned ${upstream.status}` }, { status: 502 });

  return new Response(await upstream.text(), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}

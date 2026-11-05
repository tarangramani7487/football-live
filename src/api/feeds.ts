// RSS feed list, kept free of React Native imports so the web proxy route (src/app/rss+api.ts) can use it too.
export type NewsSource = { id: string; name: string; url: string };

export const RSS_SOURCES: NewsSource[] = [
  { id: 'bbc', name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' },
  { id: 'guardian', name: 'The Guardian', url: 'https://www.theguardian.com/football/rss' },
  { id: 'sky', name: 'Sky Sports', url: 'https://www.skysports.com/rss/11095' },
];

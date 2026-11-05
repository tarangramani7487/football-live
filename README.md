# Football Live ⚽

A football app built with React Native + Expo (SDK 58, Expo Router). It works like a cricket live-score app,
with its own design: live scores, match commentary, line-ups, stats, tables, top scorers, teams, players, multi-source news and videos.

## Run it

Requires **Node.js 22.13+** (Expo SDK 58 requirement).

```bash
npm install
npx expo start        # press i (iOS), a (Android) or scan the QR code with Expo Go
```

## Data sources (all free, no API keys)

| Source | Used for | Code |
| --- | --- | --- |
| ESPN public JSON endpoints | Scores, commentary, line-ups, stats, tables, top scorers, teams, squads, players, ESPN news and video clips | `src/api/espn.ts` |
| BBC Sport, The Guardian, Sky Sports RSS | Extra news publishers in the News feed | `src/api/sources.ts`, `src/api/news.ts` |
| Wikipedia REST API | Club history ("About" tab) and player biographies | `src/api/sources.ts` |
| Open-Meteo | Kick-off weather forecast for upcoming and live matches | `src/api/sources.ts` |

ESPN's endpoints are unofficial and undocumented, so they can change without notice; don't rely on them for a high-traffic commercial app.
RSS articles open in the in-app browser on the publisher's own site.

**Web note:** the BBC/Guardian/Sky feeds don't send CORS headers, so browsers block them. On web the app fetches them through
its own route `src/app/rss+api.ts` (only those three feeds are allowed), which is why `app.json` has `web.output: "server"`.
iOS/Android fetch the feeds directly. To publish the web version you need a host that runs the server part, e.g. `npx eas-cli deploy` (EAS Hosting).

| Data | Endpoint |
| --- | --- |
| Scores by league/date | `site.api.espn.com/apis/site/v2/sports/soccer/{league}/scoreboard?dates=YYYYMMDD` |
| A league's whole month (Recent/Upcoming, 2 weeks each way, cached 5 min) | `…/soccer/{league}/scoreboard?dates=YYYYMM&limit=500` |
| Match centre (commentary, events, line-ups, stats) | `…/soccer/all/summary?event={id}` |
| League table | `site.api.espn.com/apis/v2/sports/soccer/{league}/standings` |
| Top scorers / top assists | `…/soccer/{league}/statistics` |
| News list / article | `…/soccer/{league}/news`, `content.core.api.espn.com/v1/sports/news/{id}` |
| Team, fixtures, squad, team news | `…/soccer/all/teams/{id}`, `/schedule`, `/{league}/teams/{id}/roster`, `/all/news?team={id}` |
| Video clip (MP4) | `content.core.api.espn.com/v1/sports/news/{id}` → `video[0].links.source` |
| Player profile + stats + news | `site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/{id}[/overview]` |

## Structure

```
src/
  app/                    Expo Router screens
    (tabs)/index.tsx      Home: Live / Upcoming / Recent result rows, top stories, videos
    (tabs)/matches.tsx    Live, Recent (last 2 weeks of results), Upcoming (next 2 weeks of fixtures) by day + league, or By Date
    (tabs)/news.tsx       News: Top Stories (all publishers), ESPN, BBC, Guardian, Sky, per-league
    (tabs)/videos.tsx     ESPN video clips by league
    (tabs)/leagues.tsx    Competition list
    match/[id].tsx        Match centre: Info (+ weather), Commentary, Timeline, Lineups, Stats, Table, News
    league/[slug].tsx     League: Matches, Table, Stats (top scorers/assists), News, Teams
    team/[id].tsx         Team: Fixtures, Results, Squad, News, About (Wikipedia)
    player/[id].tsx       Player: Info + Wikipedia biography, Stats per competition, News
    news/[id].tsx         Native ESPN article reader with links to related teams/players
    video/[id].tsx        Video player (expo-video)
  api/espn.ts             API client and data normalisation
  components/             Match cards, news cards, standings table, tabs, date strip…
  constants/leagues.ts    Leagues shown in the app (add/remove here)
  hooks/useFetch.ts       Loading/error/pull-to-refresh/live polling
```

## Match alerts (local notifications)

Tap the bell on a match card or in the match header to follow it. You then get:
- **Kick-off** – scheduled on the phone at kick-off time (works even when the app is closed)
- **GOAL!** – score and scorer(s), e.g. "GOAL! C Palace 0-2 Newcastle – Harvey Barnes 58'"
- **Full time** – final score

Tapping an alert opens the match. Goals are detected by the phone itself (no server):
every 30s while the app is open, and via `expo-background-task` when it is closed — the OS runs that
roughly every 15+ minutes, so background goal alerts can be late. Instant alerts with the app closed
would need a push server. Code: `src/notifications/` and `src/components/FollowButton.tsx`.
Notifications are native: rebuild the app after changing them (`npx expo run:android`). Not available on web.

Live screens refresh automatically: the match centre every 20s while the match is in play, and today's scores every 30s.

// Compares followed matches with the latest score and sends kick-off / goal / full-time alerts.
// Used by the foreground poller (every 15s while the app is open) and the background task.
import { getMatchSummary } from '@/api/espn';
import { notifyNow } from './alerts';
import { getFollows, loadFollows, updateFollow, type FollowedMatch } from './follows';

const BEFORE_KICKOFF_MS = 15 * 60000;
const AFTER_KICKOFF_MS = 5 * 3600000;

/** Followed matches worth checking right now (around kick-off and not finished). */
export function activeFollows(now = Date.now()) {
  return getFollows().filter((f) => {
    if (f.state === 'post') return false;
    const k = new Date(f.kickoff).getTime();
    return now >= k - BEFORE_KICKOFF_MS && now <= k + AFTER_KICKOFF_MS;
  });
}

function describeGoal(d: any) {
  const who = d.participants?.[0]?.athlete?.displayName ?? 'Goal';
  const tag = d.ownGoal ? ' (own goal)' : d.penaltyKick ? ' (pen)' : '';
  return `${who} ${d.clock?.displayValue ?? ''}${tag}${d.team?.displayName ? ` – ${d.team.displayName}` : ''}`.trim();
}

async function checkOne(f: FollowedMatch) {
  const data = await getMatchSummary(f.id);
  const comp = data?.header?.competitions?.[0];
  if (!comp) return;
  const competitors: any[] = comp.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
  const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
  const state = comp.status?.type?.state ?? f.state;
  const h = Number(home?.score ?? 0) || 0;
  const a = Number(away?.score ?? 0) || 0;
  const score = `${f.home} ${h}-${a} ${f.away}`;

  // Kick-off: only needed when no reminder was scheduled (e.g. followed after kick-off time).
  if (f.state === 'pre' && state !== 'pre' && !f.kickoffNotificationId) {
    await notifyNow('Kick-off', `${f.home} vs ${f.away} has started`, f.id);
  }

  // New goals since last check (a lower score, e.g. a VAR decision, just updates silently).
  if (h + a > f.homeScore + f.awayScore) {
    const goals = (comp.details ?? []).filter((d: any) => d.scoringPlay && !d.shootout);
    const fresh = goals.slice(f.homeScore + f.awayScore).map(describeGoal);
    await notifyNow(`GOAL! ${score}`, fresh.length ? fresh.join('\n') : 'Tap to see the match', f.id);
  }

  if (state === 'post' && f.state !== 'post') {
    await notifyNow('Full time', score, f.id);
  }

  if (state !== f.state || h !== f.homeScore || a !== f.awayScore) {
    await updateFollow(f.id, { state, homeScore: h, awayScore: a });
  }
}

let running: Promise<number> | null = null;

/** Checks every active followed match once. Returns how many were checked. */
export function checkFollowedMatches(): Promise<number> {
  running ??= (async () => {
    try {
      await loadFollows();
      const active = activeFollows();
      await Promise.allSettled(active.map(checkOne));
      return active.length;
    } finally {
      running = null;
    }
  })();
  return running;
}

/**
 * GET /api/live/scoreboard?week=<1–18> → { week, updatedAt, stale, matchups }
 * (kickoff as ISO strings). The schedule's 15s live poll calls this instead of
 * ESPN; lib/espnLive.ts holds one shared copy per week (15s while a game is in
 * its live window, ≤5 min idle, never past the next window's start).
 * X-Pare-Cache: HIT | MISS | STALE · 400 invalid-week · 502 upstream · 503 busy.
 */
import { getLiveScoreboard, liveFail, liveOk, liveUpstreamFailure, parseLiveWeek, scoreboardBody } from '@/lib/espnLive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const week = parseLiveWeek(new URL(req.url).searchParams.get('week'));
  if (week === null) return liveFail(400, 'invalid-week');
  try {
    const result = await getLiveScoreboard(week);
    return liveOk(scoreboardBody(result), result);
  } catch (err) {
    return liveUpstreamFailure(err);
  }
}

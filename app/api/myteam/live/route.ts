/**
 * GET /api/myteam/live?id=<league_id>&uid=<user_id>&w=<week> → LivePoints
 * ({ week, total, byPlayer }) for MY roster only — a few hundred bytes.
 * 400 bad input · 404 not a member / no matchup row · 502/503 upstream. Never
 * cached by the browser; the adapter's keyed cache holds Sleeper's matchups for
 * 60s (= Sleeper's own CDN `s-maxage=60`), so 1 call/min per league at most.
 */
import type { NextRequest } from 'next/server';
import { fail, ok, upstreamFailure } from '@/lib/myteam/apiErrors';
import { sleeperProvider } from '@/lib/myteam/sleeper/adapter';
import { isValidId } from '@/lib/myteam/store';

export const dynamic = 'force-dynamic';

/** Regular season only (postseason is out of scope for v1). */
function parseWeek(v: string | null): number | null {
  if (!v || !/^\d{1,2}$/.test(v)) return null;
  const w = Number(v);
  return w >= 1 && w <= 18 ? w : null;
}

export async function GET(req: NextRequest) {
  const leagueId = req.nextUrl.searchParams.get('id');
  const userId = req.nextUrl.searchParams.get('uid');
  const week = parseWeek(req.nextUrl.searchParams.get('w'));
  if (!isValidId(leagueId) || !isValidId(userId) || week === null) return fail(400, 'invalid-input');
  try {
    const started = performance.now();
    const live = await sleeperProvider.getLivePoints(leagueId, userId, week);
    return live ? ok(live, performance.now() - started) : fail(404, 'not-in-league');
  } catch (err) {
    return upstreamFailure(err, 'myteam:live');
  }
}

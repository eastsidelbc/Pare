/**
 * GET /api/myteam/league?id=<league_id>&uid=<user_id> → LeagueBundle
 * (league, my roster, schedule for my players' teams, FPA table, game logs).
 * 400 bad ids · 404 not a member · 502/503 upstream. Never cached.
 */
import type { NextRequest } from 'next/server';
import { buildLeagueBundle } from '@/lib/myteam/bundle';
import { fail, ok, upstreamFailure } from '@/lib/myteam/apiErrors';
import { isValidId } from '@/lib/myteam/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const leagueId = req.nextUrl.searchParams.get('id');
  const userId = req.nextUrl.searchParams.get('uid');
  if (!isValidId(leagueId) || !isValidId(userId)) return fail(400, 'invalid-id');
  try {
    const started = performance.now();
    const bundle = await buildLeagueBundle(leagueId, userId);
    return bundle ? ok(bundle, performance.now() - started) : fail(404, 'not-in-league');
  } catch (err) {
    return upstreamFailure(err, 'myteam:league');
  }
}

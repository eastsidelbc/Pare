/**
 * GET /api/myteam/user?u=<sleeper username> → { user, season, leagues }
 * 400 bad username · 404 unknown user · 502/503 upstream. Never cached.
 */
import type { NextRequest } from 'next/server';
import { currentSeason } from '@/lib/myteam/bundle';
import { fail, ok, upstreamFailure } from '@/lib/myteam/apiErrors';
import { sleeperProvider } from '@/lib/myteam/sleeper/adapter';
import { isValidUsername } from '@/lib/myteam/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('u');
  if (!isValidUsername(username)) return fail(400, 'invalid-username');
  try {
    const started = performance.now();
    const user = await sleeperProvider.resolveUser(username);
    if (!user) return fail(404, 'user-not-found');
    const season = await currentSeason();
    const leagues = await sleeperProvider.listLeagues(user.userId, season);
    return ok({ user, season, leagues }, performance.now() - started);
  } catch (err) {
    return upstreamFailure(err, 'myteam:user');
  }
}

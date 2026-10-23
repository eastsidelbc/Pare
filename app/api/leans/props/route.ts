/**
 * GET /api/leans/props?week=N → { games: Record<MatchupId, GamePropLine[]> }
 * (lib/leans/propLinesServer.ts): every prop-eligible player's line from the book feed,
 * open + current, per Leans stat. Lines only — no user data. 400 bad week · 502 upstream.
 */
import type { NextRequest } from 'next/server';
import { parseLiveWeek } from '@/lib/espnLive';
import { getWeekPropLines } from '@/lib/leans/propLinesServer';
import { fail, ok, upstreamFailure } from '@/lib/myteam/apiErrors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const week = parseLiveWeek(req.nextUrl.searchParams.get('week'));
  if (week === null) return fail(400, 'invalid-week');
  try {
    const started = performance.now();
    return ok({ games: await getWeekPropLines(week) }, performance.now() - started);
  } catch (err) {
    return upstreamFailure(err, 'leans:props');
  }
}

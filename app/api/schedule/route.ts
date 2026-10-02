/**
 * GET /api/schedule?week=N
 *
 * Returns the mapped `Matchup[]` for a regular-season week (1–18), reusing the
 * same ESPN fetch + mapping as `lib/schedule.ts` (no duplicate mapping logic).
 * Backs the client-side week switcher on the schedule home. ~5 min cache +
 * empty-array fallback are inherited from `getMatchupsForWeek`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMatchupsForWeek, MIN_WEEK, MAX_WEEK } from '@/lib/schedule';
// Note: this route is fully dynamic (reads `week` query param) so route-level
// `export const revalidate` is not applicable. Caching is handled at the fetch
// level inside getMatchupsForWeek / lib/schedule.ts (next.revalidate:
// LIVE_REVALIDATE_SECONDS = 300, i.e. 5 min). Live scores while viewing come from
// the browser's own 15s ESPN poll (useLiveScores), not from this route.

export async function GET(req: NextRequest) {
  const weekParam = req.nextUrl.searchParams.get('week');
  const week = Number(weekParam);

  if (!Number.isInteger(week) || week < MIN_WEEK || week > MAX_WEEK) {
    return NextResponse.json(
      { error: `week must be an integer between ${MIN_WEEK} and ${MAX_WEEK}` },
      { status: 400 },
    );
  }

  const matchups = await getMatchupsForWeek(week);
  return NextResponse.json({ week, matchups });
}

/**
 * GET /api/leaders
 *
 * Returns every leaderboard (offense / defense / special teams) as typed
 * `LeaderBoard[]`, sourced from ESPN's public byathlete endpoint via
 * `lib/leaders.ts`. Board fetches are cached ~6h at the fetch layer, so this
 * route stays cheap under load. Backs the Leaderboards tab.
 */

import { NextResponse } from 'next/server';
import { getAllLeaderboards } from '@/lib/leaders';

export async function GET() {
  const boards = await getAllLeaderboards();
  return NextResponse.json({ updatedAt: new Date().toISOString(), boards });
}

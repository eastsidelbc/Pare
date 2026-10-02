/**
 * GET /api/standings
 *
 * Returns the full league standings grouped AFC → NFC → division, sourced from
 * ESPN's public standings endpoint via `lib/standings.ts`. NOT cached — fresh
 * ESPN pull on every request (one cheap call), so records update the moment a
 * game goes final. Backs the Standings tab
 * (and is iOS-ready per Mobile_plan.md).
 */

import { NextResponse } from 'next/server';
import { getStandings } from '@/lib/standings';

// Live data — fetch fresh on every request (no ISR cache) so standings are
// always current. getStandings() fetches no-store.
export const dynamic = 'force-dynamic';

export async function GET() {
  const conferences = await getStandings();
  return NextResponse.json({ updatedAt: new Date().toISOString(), conferences });
}

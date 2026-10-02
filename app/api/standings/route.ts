/**
 * GET /api/standings
 *
 * Returns the full league standings grouped AFC → NFC → division, sourced from
 * ESPN's public standings endpoint via `lib/standings.ts`. Cached ~1h at the
 * fetch layer, so this route stays cheap under load. Backs the Standings tab
 * (and is iOS-ready per Mobile_plan.md).
 */

import { NextResponse } from 'next/server';
import { getStandings } from '@/lib/standings';

// Re-render every 5 min — standings change on game day (matches the fetch cache).
export const revalidate = 300; // 5 minutes

export async function GET() {
  const conferences = await getStandings();
  return NextResponse.json({ updatedAt: new Date().toISOString(), conferences });
}

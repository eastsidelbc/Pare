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

// Re-render on the same cadence as the underlying ESPN fetch.
export const revalidate = 3600; // 1 hour

export async function GET() {
  const conferences = await getStandings();
  return NextResponse.json({ updatedAt: new Date().toISOString(), conferences });
}

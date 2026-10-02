/**
 * NFL Offense Stats API Route Handler
 *
 * Serves live team offense season totals from ESPN (all 32 teams), cached in-memory
 * + via Next ISR. Returns raw rows; ranking is computed client-side (useRanking).
 *
 * WARNING: Do not rename stat keys without updating UI consumption accordingly.
 */

import { NextResponse } from 'next/server';
import { type TeamStats } from '@/lib/types';
import { fetchOffenseStatsFromESPN } from '@/lib/espnStats';
import { APP_CONSTANTS } from '@/config/constants';
import { logger } from '@/utils/logger';
import { generateRequestId } from '@/utils/helpers';
import { createTtlCache } from '@/lib/apiCache';

// ISR: the route response is cached and rebuilt in the background every 10 min
// (Vercel and self-hosted `next start` alike), so requests get cached JSON without re-running any ESPN fetches.
// Value must be a literal for Next.js static analysis (keep in sync with REVALIDATE_SECONDS).
export const revalidate = 600; // 10 minutes

// API Response interface
interface ApiResponse {
  season: number;
  type: string;
  updatedAt: string;
  rows: TeamStats[];
  stale?: boolean;
  error?: string;
}

// Last-good BACKUP only (lives for the server process lifetime). Freshness is
// owned by ONE timer — the route `revalidate` above. This copy is never served
// on the happy path; it's only read via getStale() when ESPN fails, so users get
// the last good numbers instead of an error. (It used to be checked FIRST with a
// 6h TTL, which silently froze stats on self-hosted for up to 6h — see
// docs/devnotes/2026-10-02-data-freshness.md.)
const cache = createTtlCache<ApiResponse>(0); // maxAge 0 = never "fresh" — backup only

// ✅ Server-side ranking removed - now handled client-side by useRanking hook

export async function GET() {
  const requestId = generateRequestId();

  try {
    // Fetch fresh data — PRIMARY: live ESPN offense totals; FALLBACK: last-good backup.
    const startTime = Date.now();

    let updatedAt: string;
    let rows: TeamStats[];

    try {
      // 🏈 Live 2026 offense season totals from ESPN (all 32 teams in parallel).
      ({ updatedAt, rows } = await fetchOffenseStatsFromESPN());
      logger.performance(
        { context: 'OFFENSE', requestId },
        `Served ${rows.length} teams from ESPN (${APP_CONSTANTS.SEASON})`
      );
    } catch (espnError) {
      const msg = espnError instanceof Error ? espnError.message : String(espnError);
      logger.error({ context: 'OFFENSE', requestId }, `ESPN offense fetch failed: ${msg}`);

      // RESILIENCE 1: serve stale cache if we have any.
      const stale = cache.getStale();
      if (stale) {
        logger.performance(
          { context: 'OFFENSE', requestId },
          'Serving STALE cache after ESPN failure'
        );
        const staleResponse: ApiResponse = { ...stale, stale: true, error: msg };
        return NextResponse.json(staleResponse, {
          headers: {
            'Cache-Control': 'public, max-age=60',
            'Content-Type': 'application/json',
            'X-Cache': 'STALE',
            'X-Source': 'ESPN-STALE',
            'X-Request-ID': requestId,
          },
        });
      }

      // No cache to serve — bubble to the outer catch → 500. Data is ESPN-only
      // now; the old 2025 CSV fallback was removed in the cleanup overhaul.
      throw espnError;
    }

    if (rows.length === 0) {
      throw new Error('No team data found (ESPN returned empty)');
    }

    // ✅ Rankings computed client-side via useRanking hook (unchanged).
    const response: ApiResponse = {
      season: APP_CONSTANTS.SEASON,
      type: 'offense',
      updatedAt,
      rows,
    };

    cache.set(response);

    logger.performance({ context: 'OFFENSE', requestId }, 'API Processing Complete', {
      duration: Date.now() - startTime,
      operation: `Processed ${rows.length} teams via ESPN`
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'X-Source': 'ESPN',
        'X-Request-ID': requestId,
        'X-Processing-Time': `${Date.now() - startTime}ms`,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';

    console.error(`❌ [OFFENSE-${requestId}] Error processing request:`, {
      error: errorMessage,
      stack: errorStack,
      type: error instanceof Error ? error.constructor.name : typeof error
    });

    // If we have stale cache data, serve it with a warning
    const stale = cache.getStale();
    if (stale) {

      const staleResponse: ApiResponse = {
        ...stale,
        stale: true,
        error: errorMessage
      };

      return NextResponse.json(staleResponse, {
        headers: {
          'Cache-Control': 'public, max-age=60',
          'Content-Type': 'application/json',
          'X-Cache': 'STALE',
          'X-Request-ID': requestId,
          'X-Error': 'served-stale-data',
        },
      });
    }

    // No cache available, return detailed error
    console.error(`💥 [OFFENSE-${requestId}] No cache available, returning error to client`);

    // Generic client-facing error — full detail (errorMessage/stack) is logged
    // server-side above and intentionally NOT leaked to the client.
    return NextResponse.json(
      {
        error: 'Failed to fetch offense data',
        requestId,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Error': 'no-cache-available',
        },
      }
    );
  }
}

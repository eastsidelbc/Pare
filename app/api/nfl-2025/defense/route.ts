/**
 * NFL Defense Stats API Route Handler
 *
 * Serves team defense stats from ESPN (points allowed via standings + yards allowed
 * opponent-aggregated from box scores). Returns raw rows; ranking is client-side.
 *
 * Returns defense stats where lower values are generally better (points/yards allowed).
 *
 * WARNING: Do not rename data-stat keys without updating UI consumption accordingly.
 */

import { NextResponse } from 'next/server';
import { type TeamStats } from '@/lib/types';
import { fetchDefenseStatsFromESPN, fetchDefenseYardsAllowed } from '@/lib/espnStats';
import { NFL_TEAMS } from '@/lib/teams';
import { APP_CONSTANTS } from '@/config/constants';
import { logger } from '@/utils/logger';
import { generateRequestId } from '@/utils/helpers';
import { createTtlCache } from '@/lib/apiCache';

// ISR: the route response is cached and rebuilt in the background every 10 min
// (Vercel and self-hosted `next start` alike), so requests get cached JSON without re-running the ESPN aggregation.
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
    // Fetch fresh data — PRIMARY: live ESPN standings (points allowed only).
    // Yards-allowed stays "—" (Step 4). We NEVER serve 2025 CSV for defense now,
    // to avoid mixing 2026 points with stale 2025 yards.
    const startTime = Date.now();

    let updatedAt: string;
    let rows: TeamStats[];
    let source: 'ESPN-STANDINGS' | 'EMPTY-FALLBACK';

    try {
      // 🛡️ Live 2026 points-allowed for all 32 teams from ESPN standings.
      ({ updatedAt, rows } = await fetchDefenseStatsFromESPN());
      source = 'ESPN-STANDINGS';
      logger.performance(
        { context: 'DEFENSE', requestId },
        `Served ${rows.length} teams from ESPN standings (${APP_CONSTANTS.SEASON})`
      );

      // Step 4 — best-effort: enrich with yards-allowed via opponent aggregation.
      // If it fails, we keep Step-3 behaviour (yards render as "—"); never crash.
      try {
        const yards = await fetchDefenseYardsAllowed();
        let enriched = 0;
        rows = rows.map((r) => {
          const y = yards.get(r.team);
          if (!y || y.games === 0) return r;
          enriched++;
          const merged: TeamStats = {
            ...r,
            total_yards: String(Math.round(y.total_yards)),
            pass_yds: String(Math.round(y.pass_yds)),
            rush_yds: String(Math.round(y.rush_yds)),
          };
          // Attempts-weighted opponent 3rd-down %: Σconv / Σatt × 100.
          if (y.td3Att > 0) {
            merged.third_down_pct = String((y.td3Conv / y.td3Att) * 100);
          }
          return merged;
        });
        logger.performance(
          { context: 'DEFENSE', requestId },
          `Enriched yards-allowed for ${enriched}/${rows.length} teams`
        );
      } catch (aggError) {
        const aggMsg = aggError instanceof Error ? aggError.message : String(aggError);
        logger.error(
          { context: 'DEFENSE', requestId },
          `Yards aggregation failed (keeping "—"): ${aggMsg}`
        );
      }
    } catch (espnError) {
      const msg = espnError instanceof Error ? espnError.message : String(espnError);
      logger.error({ context: 'DEFENSE', requestId }, `ESPN standings fetch failed: ${msg}`);

      // RESILIENCE 1: serve stale cache if we have any.
      const stale = cache.getStale();
      if (stale) {
        logger.performance(
          { context: 'DEFENSE', requestId },
          'Serving STALE cache after ESPN failure'
        );
        const staleResponse: ApiResponse = { ...stale, stale: true, error: msg };
        return NextResponse.json(staleResponse, {
          headers: {
            'Cache-Control': 'public, max-age=60',
            'Content-Type': 'application/json',
            'X-Cache': 'STALE',
            'X-Source': 'ESPN-STANDINGS-STALE',
            'X-Request-ID': requestId,
          },
        });
      }

      // RESILIENCE 2: no cache — return 32 team rows with NO stats so the UI
      // shows "—" for points rather than crashing (never the 2025 CSV).
      logger.performance(
        { context: 'DEFENSE', requestId },
        'No cache — serving empty (—) defense rows'
      );
      updatedAt = new Date().toISOString();
      rows = NFL_TEAMS.map((t) => ({ team: t.name }));
      source = 'EMPTY-FALLBACK';
    }

    if (rows.length === 0) {
      throw new Error('No team data found (ESPN standings empty)');
    }

    // ✅ Rankings computed client-side via useRanking hook (unchanged).
    const response: ApiResponse = {
      season: APP_CONSTANTS.SEASON,
      type: 'defense',
      updatedAt,
      rows,
      ...(source === 'EMPTY-FALLBACK'
        ? { stale: true, error: 'served-empty-defense-fallback' }
        : {}),
    };

    // Only cache a full, live standings result.
    if (source === 'ESPN-STANDINGS') {
      cache.set(response);
    }

    logger.performance({ context: 'DEFENSE', requestId }, 'API Processing Complete', {
      duration: Date.now() - startTime,
      operation: `Processed ${rows.length} teams via ${source}`
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'X-Source': source,
        'X-Request-ID': requestId,
        'X-Processing-Time': `${Date.now() - startTime}ms`,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';

    console.error(`❌ [DEFENSE-${requestId}] Error processing request:`, {
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
    console.error(`💥 [DEFENSE-${requestId}] No cache available, returning error to client`);

    // Generic client-facing error — full detail (errorMessage/stack) is logged
    // server-side above and intentionally NOT leaked to the client.
    return NextResponse.json(
      {
        error: 'Failed to fetch defense data',
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

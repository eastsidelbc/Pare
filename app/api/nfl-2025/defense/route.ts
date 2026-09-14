/**
 * NFL 2025 Defense Stats API Route Handler
 * 
 * Scrapes team defense stats (opponents) from Pro Football Reference and returns ranked JSON data.
 * 
 * Source: https://www.pro-football-reference.com/years/2025/opp.htm#team_stats
 * 
 * Returns defense stats where lower values are generally better (points allowed, yards allowed).
 * 
 * WARNING: Do not rename data-stat keys without updating UI consumption accordingly.
 */

import { NextResponse } from 'next/server';
import { type TeamStats } from '@/lib/pfrCsv';
import { fetchDefenseStatsFromESPN, fetchDefenseYardsAllowed } from '@/lib/espnStats';
import { NFL_TEAMS } from '@/lib/teams';
import { APP_CONSTANTS } from '@/config/constants';
import { logger } from '@/utils/logger';
import { generateRequestId } from '@/utils/helpers';

// Cache the full route response on Vercel's Data Cache so cold serverless
// invocations get the cached JSON without re-running the ESPN aggregation.
// Value must be a literal for Next.js static analysis (keep in sync with REVALIDATE_SECONDS).
export const revalidate = 3600; // 1 hour

// API Response interface
interface ApiResponse {
  season: number;
  type: string;
  updatedAt: string;
  rows: TeamStats[];
  stale?: boolean;
  error?: string;
}

// In-memory cache
interface CacheEntry {
  data: ApiResponse | null;
  timestamp: number;
  maxAge: number;
}

let cache: CacheEntry = {
  data: null,
  timestamp: 0,
  maxAge: process.env.NODE_ENV === 'production' ? APP_CONSTANTS.CACHE.PRODUCTION_MAX_AGE : APP_CONSTANTS.CACHE.DEBUG_MAX_AGE
};

// ✅ Server-side ranking removed - now handled client-side by useRanking hook

export async function GET() {
  const requestId = generateRequestId();
  
  // API request start (verbose only) 
  // Environment info (verbose only)
  
  try {
    // Check cache first
    const now = Date.now();
    if (cache.data && cache.timestamp && (now - cache.timestamp) < cache.maxAge) {
      // Cached data info (verbose only)
      
      return NextResponse.json(cache.data, {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Request-ID': requestId,
        },
      });
    }

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
      if (cache.data) {
        logger.performance(
          { context: 'DEFENSE', requestId },
          'Serving STALE cache after ESPN failure'
        );
        const staleResponse: ApiResponse = { ...cache.data, stale: true, error: msg };
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
      cache = {
        data: response,
        timestamp: now,
        maxAge: cache.maxAge,
      };
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
      type: error instanceof Error ? error.constructor.name : typeof error,
      url: 'https://www.pro-football-reference.com/years/2025/opp.htm#team_stats'
    });

    // If we have stale cache data, serve it with a warning
    if (cache.data) {
      // Stale cache info (verbose only)
      
      const staleResponse: ApiResponse = {
        ...cache.data,
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
    
    return NextResponse.json(
      {
        error: 'Failed to fetch defense data',
        message: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
        details: {
          url: 'https://www.pro-football-reference.com/years/2025/opp.htm#team_stats',
          cacheStatus: 'UNAVAILABLE',
          errorType: error instanceof Error ? error.constructor.name : typeof error
        }
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

/**
 * NFL 2025 Offense Stats API Route Handler
 * 
 * Scrapes team offense stats from Pro Football Reference and returns ranked JSON data.
 * 
 * Source: https://www.pro-football-reference.com/years/2025/#team_stats
 * 
 * Returns offense stats where higher values are generally better (points, yards, TDs).
 * 
 * WARNING: Do not rename data-stat keys without updating UI consumption accordingly.
 */

import { NextResponse } from 'next/server';
import { fetchAndParseCSV, type TeamStats } from '@/lib/pfrCsv';
import { fetchOffenseStatsFromESPN } from '@/lib/espnStats';
import { APP_CONSTANTS } from '@/config/constants';
import { logger } from '@/utils/logger';
import { generateRequestId, getCacheAgeMinutes } from '@/utils/helpers';

// Cache the full route response on Vercel's Data Cache so cold serverless
// invocations get the cached JSON without re-running any ESPN fetches.
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
  const timestamp = new Date().toISOString();
  
  // API request start (verbose only) 
  // Environment info (verbose only)
  
  // Process info (verbose only)
  
  try {
    // Check cache first
    const now = Date.now();
    // Cache checking (verbose only)
    
    if (cache.data && cache.timestamp && (now - cache.timestamp) < cache.maxAge) {
      logger.cache({ context: 'OFFENSE', requestId }, `Serving cached data (${getCacheAgeMinutes(cache.timestamp)} min old)`, {
        teamCount: cache.data.rows.length
      });
      
      return NextResponse.json(cache.data, {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Request-ID': requestId,
        },
      });
    }

    // Fetch fresh data — PRIMARY: live ESPN offense totals; FALLBACK: 2025 CSV.
    const startTime = Date.now();

    let updatedAt: string;
    let rows: TeamStats[];
    let source: 'ESPN' | 'CSV-FALLBACK';

    try {
      // 🏈 Live 2026 offense season totals from ESPN (all 32 teams in parallel).
      ({ updatedAt, rows } = await fetchOffenseStatsFromESPN());
      source = 'ESPN';
      logger.performance(
        { context: 'OFFENSE', requestId },
        `Served ${rows.length} teams from ESPN (${APP_CONSTANTS.SEASON})`
      );
    } catch (espnError) {
      const msg = espnError instanceof Error ? espnError.message : String(espnError);
      logger.error({ context: 'OFFENSE', requestId }, `ESPN offense fetch failed: ${msg}`);

      // RESILIENCE 1: serve stale cache if we have any.
      if (cache.data) {
        logger.performance(
          { context: 'OFFENSE', requestId },
          'Serving STALE cache after ESPN failure'
        );
        const staleResponse: ApiResponse = { ...cache.data, stale: true, error: msg };
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

      // RESILIENCE 2: no cache — fall back to the existing 2025 offense CSV so the
      // app never blanks. (Throws → outer catch → 500 if the CSV is also gone.)
      logger.performance(
        { context: 'OFFENSE', requestId },
        'No cache — falling back to 2025 offense CSV'
      );
      ({ updatedAt, rows } = await fetchAndParseCSV({ type: 'offense' }));
      source = 'CSV-FALLBACK';
    }

    if (rows.length === 0) {
      throw new Error('No team data found (ESPN + CSV both empty)');
    }

    // ✅ Rankings computed client-side via useRanking hook (unchanged).
    const response: ApiResponse = {
      season: APP_CONSTANTS.SEASON,
      type: 'offense',
      updatedAt,
      rows,
      ...(source === 'CSV-FALLBACK'
        ? { stale: true, error: 'served-2025-csv-fallback' }
        : {}),
    };

    // Only cache a full, live ESPN result — never cache the CSV fallback as if fresh.
    if (source === 'ESPN') {
      cache = {
        data: response,
        timestamp: now,
        maxAge: cache.maxAge,
      };
    }

    logger.performance({ context: 'OFFENSE', requestId }, 'API Processing Complete', {
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
    
    console.error(`❌ [OFFENSE-${requestId}] Error processing request:`, {
      error: errorMessage,
      stack: errorStack,
      type: error instanceof Error ? error.constructor.name : typeof error,
      url: 'https://www.pro-football-reference.com/years/2025/#team_stats'
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
    console.error(`💥 [OFFENSE-${requestId}] No cache available, returning error to client`);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch offense data',
        message: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
        details: {
          url: 'https://www.pro-football-reference.com/years/2025/#team_stats',
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

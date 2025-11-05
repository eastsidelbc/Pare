/**
 * NFL 2025 Offense Stats API Route Handler
 *
 * Scrapes team offense stats from Pro Football Reference and returns ranked JSON data.
 * Source: https://www.pro-football-reference.com/years/2025/#team_stats
 *
 * Returns offense stats where higher values are generally better (points, yards, TDs).
 * WARNING: Do not rename data-stat keys without updating UI consumption accordingly.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';                         // ⬅️ added for ETag hashing
import { fetchAndParseCSV, type TeamStats } from '@/lib/pfrCsv';
import { APP_CONSTANTS } from '@/config/constants';
import { logger } from '@/utils/logger';
import { generateRequestId, getCacheAgeMinutes } from '@/utils/helpers';

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
  maxAge:
    process.env.NODE_ENV === 'production'
      ? APP_CONSTANTS.CACHE.PRODUCTION_MAX_AGE
      : APP_CONSTANTS.CACHE.DEBUG_MAX_AGE,
};

// Small helper: stable ETag from a JSON-able object
function makeEtag(obj: unknown) {
  // quotes are customary for weak/strong tags; here we use a strong tag with quotes
  return `"${crypto.createHash('sha1').update(JSON.stringify(obj)).digest('hex')}"`;
}

// ✅ Server-side ranking removed - now handled client-side by useRanking hook
export async function GET(request: Request) {
  const requestId = generateRequestId();
  const ifNoneMatch = request.headers.get('if-none-match') || undefined;

  try {
    const now = Date.now();

    // ---------- Fast path: valid cache present ----------
    if (cache.data && cache.timestamp && now - cache.timestamp < cache.maxAge) {
      // If client sent If-None-Match and it matches our cached payload, short-circuit with 304
      const cachedEtag = makeEtag(cache.data);
      if (ifNoneMatch && ifNoneMatch === cachedEtag) {
        // 304: Not Modified (no body)
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: cachedEtag,
            'Cache-Control': 'public, max-age=300',
            'X-Cache': 'HIT-304',
            'X-Request-ID': requestId,
          },
        });
      }

      // Otherwise, serve cached JSON
      logger.cache?.({ context: 'OFFENSE', requestId }, `Serving cached data (${getCacheAgeMinutes(cache.timestamp)} min old)`, {
        teamCount: cache.data.rows.length,
      });

      const etag = cachedEtag; // same as above
      return NextResponse.json(cache.data, {
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=300',
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Request-ID': requestId,
        },
      });
    }

    // ---------- No valid cache → fetch fresh ----------
    const fetchStart = Date.now();
    const { updatedAt, rows } = await fetchAndParseCSV({ type: 'offense' });
    const fetchTime = Date.now() - fetchStart;

    if (!rows || rows.length === 0) {
      throw new Error('No team data found in PFR response');
    }

    // Build response (no server-side ranking)
    const response: ApiResponse = {
      season: 2025,
      type: 'offense',
      updatedAt,
      rows,
    };

    // Update cache
    cache = {
      data: response,
      timestamp: Date.now(),
      maxAge: cache.maxAge,
    };

    // Compute ETag for the fresh payload
    const etag = makeEtag(response);

    // If the client already has this exact version, return 304
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=300',
          'X-Cache': 'MISS-304',
          'X-Request-ID': requestId,
        },
      });
    }

    logger.performance?.({ context: 'OFFENSE', requestId }, 'API Processing Complete', {
      duration: Date.now() - fetchStart,
      fetchTime,
      operation: `Processed ${rows.length} teams`,
    });

    return NextResponse.json(response, {
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=300',
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'X-Request-ID': requestId,
        'X-Processing-Time': `${Date.now() - fetchStart}ms`,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';

    // Keep your existing error logs
    console.error(`❌ [OFFENSE-${requestId}] Error processing request:`, {
      error: errorMessage,
      stack: errorStack,
      type: error instanceof Error ? error.constructor.name : typeof error,
      url: 'https://www.pro-football-reference.com/years/2025/#team_stats',
    });

    // Serve stale if available
    if (cache.data) {
      const staleResponse: ApiResponse = {
        ...cache.data,
        stale: true,
        error: errorMessage,
      };
      const etag = makeEtag(staleResponse);

      return NextResponse.json(staleResponse, {
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=60',
          'Content-Type': 'application/json',
          'X-Cache': 'STALE',
          'X-Request-ID': requestId,
          'X-Error': 'served-stale-data',
        },
      });
    }

    // No cache → return detailed error
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
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
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

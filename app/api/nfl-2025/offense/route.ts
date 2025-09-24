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
import { fetchAndParseCSV, computeRanks, type RankBasis, type TeamStatsWithRanks } from '@/lib/pfrCsv';

// API Response interface
interface ApiResponse {
  season: number;
  type: string;
  updatedAt: string;
  rankBasis: RankBasis;
  rows: TeamStatsWithRanks[];
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
  maxAge: 6 * 60 * 60 * 1000 // 6 hours in milliseconds
};

// Ranking basis for offense metrics (higher = better)
// These metrics match the dual-section UI requirements
const OFFENSE_RANK_BASIS: RankBasis = {
  // Dual-section UI required metrics
  'points': 'desc',           // Points (per game)
  'total_yards': 'desc',      // Total Yards (per game)
  'pass_yds': 'desc',         // Passing Yards (per game)
  'rush_yds': 'desc',         // Rushing Yards (per game)
  'third_down_pct': 'desc',   // 3rd Down % (conversion rate)
  
  // Additional useful metrics
  'pass_td': 'desc',          // Passing touchdowns
  'rush_td': 'desc',          // Rushing touchdowns
  'pass_cmp': 'desc',         // Pass completions
  'pass_att': 'desc',         // Pass attempts
  'rush_att': 'desc',         // Rush attempts
};

export async function GET() {
  const requestId = Math.random().toString(36).substr(2, 9);
  const timestamp = new Date().toISOString();
  
  console.log(`\n🏈 [OFFENSE-${requestId}] [${timestamp}] ===== API REQUEST START =====`);
  console.log(`🏈 [OFFENSE-${requestId}] Environment:`, {
    nodeVersion: process.version,
    platform: process.platform,
    cacheStatus: cache.data ? 'EXISTS' : 'EMPTY',
    cacheAge: cache.timestamp ? Math.round((Date.now() - cache.timestamp) / 1000 / 60) : 'N/A'
  });
  
  // Add more environment debugging
  console.log(`🏈 [OFFENSE-${requestId}] Process info:`, {
    pid: process.pid,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  });
  
  try {
    // Check cache first
    const now = Date.now();
    if (cache.data && cache.timestamp && (now - cache.timestamp) < cache.maxAge) {
      const cacheAgeMinutes = Math.round((now - cache.timestamp) / 1000 / 60);
      console.log(`💾 [OFFENSE-${requestId}] Serving cached data (${cacheAgeMinutes} min old)`);
      console.log(`💾 [OFFENSE-${requestId}] Cache contains ${cache.data.rows.length} teams`);
      
      return NextResponse.json(cache.data, {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Request-ID': requestId,
        },
      });
    }

    // Fetch fresh data from local CSV file
    console.log(`📁 [OFFENSE-${requestId}] Cache miss - reading fresh data from CSV file...`);
    console.log(`📁 [OFFENSE-${requestId}] File: data/pfr/offense-2025.csv`);
    console.log(`📁 [OFFENSE-${requestId}] Rank basis:`, OFFENSE_RANK_BASIS);
    
    const startTime = Date.now();
    const { updatedAt, rows } = await fetchAndParseCSV({
      type: 'offense'
    });
    const fetchTime = Date.now() - startTime;
    
    console.log(`📊 [OFFENSE-${requestId}] Fetch completed in ${fetchTime}ms`);
    console.log(`📊 [OFFENSE-${requestId}] Raw data: ${rows.length} teams`);
    
    if (rows.length === 0) {
      throw new Error('No team data found in PFR response');
    }

    // Log sample of raw data
    console.log(`📊 [OFFENSE-${requestId}] Sample raw team:`, {
      team: rows[0]?.team,
      availableFields: Object.keys(rows[0] || {}),
      sampleValues: {
        points: rows[0]?.points,
        total_yards: rows[0]?.total_yards,
        pass_yds: rows[0]?.pass_yds
      }
    });

    // Compute rankings
    console.log(`🏆 [OFFENSE-${requestId}] Computing rankings...`);
    const rankStartTime = Date.now();
    const rowsWithRanks = computeRanks(rows, OFFENSE_RANK_BASIS);
    const rankTime = Date.now() - rankStartTime;
    
    console.log(`🏆 [OFFENSE-${requestId}] Ranking completed in ${rankTime}ms`);
    console.log(`🏆 [OFFENSE-${requestId}] Sample ranked team:`, {
      team: rowsWithRanks[0]?.team,
      ranks: rowsWithRanks[0]?.ranks
    });

    // Build response object
    const response: ApiResponse = {
      season: 2025,
      type: 'offense',
      updatedAt,
      rankBasis: OFFENSE_RANK_BASIS,
      rows: rowsWithRanks
    };

    // Update cache
    cache = {
      data: response,
      timestamp: now,
      maxAge: cache.maxAge
    };

    console.log(`✅ [OFFENSE-${requestId}] Successfully processed ${rowsWithRanks.length} teams`);
    console.log(`✅ [OFFENSE-${requestId}] Total processing time: ${Date.now() - startTime}ms`);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
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
      console.log(`🔄 [OFFENSE-${requestId}] Serving stale cache data due to error`);
      console.log(`🔄 [OFFENSE-${requestId}] Stale cache age: ${Math.round((Date.now() - cache.timestamp) / 1000 / 60)} minutes`);
      
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

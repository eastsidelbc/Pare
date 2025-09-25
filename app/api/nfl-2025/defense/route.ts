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
  maxAge: 10 * 1000 // 10 seconds for debugging (change back to 6 hours later)
};

// Ranking basis for defense metrics (lower = better for most defensive stats)
// These metrics match the exact PFR defense table structure
const DEFENSE_RANK_BASIS: RankBasis = {
  // === TOT YDS & TO SECTION (Defense - PA instead of PF) ===
  'g': 'desc',                    // Games (more games = more data)
  'points': 'asc',                // Points Allowed (PA) - lower is better
  'total_yards': 'asc',           // Total Yards Allowed - lower is better
  'plays_offense': 'asc',         // Plays Against - fewer is better
  'yds_per_play_offense': 'asc',  // Y/P Allowed - lower is better
  'turnovers': 'desc',            // Turnovers Forced - higher is better
  'fumbles_lost': 'desc',         // Fumbles Recovered - higher is better  
  'first_down': 'asc',            // 1st Downs Allowed - lower is better

  // === PASSING DEFENSE SECTION ===
  'pass_cmp': 'asc',              // Completions Allowed - lower is better
  'pass_att': 'asc',              // Attempts Against - fewer is better
  'pass_yds': 'asc',              // Passing Yards Allowed - lower is better
  'pass_td': 'asc',               // Passing TDs Allowed - lower is better
  'pass_int': 'desc',             // Interceptions - higher is better
  'pass_net_yds_per_att': 'asc',  // NY/A Allowed - lower is better
  'pass_fd': 'asc',               // Pass 1st Downs Allowed - lower is better

  // === RUSHING DEFENSE SECTION ===
  'rush_att': 'asc',              // Rush Attempts Against - fewer is better
  'rush_yds': 'asc',              // Rushing Yards Allowed - lower is better
  'rush_td': 'asc',               // Rushing TDs Allowed - lower is better
  'rush_yds_per_att': 'asc',      // Y/A Allowed - lower is better
  'rush_fd': 'asc',               // Rush 1st Downs Allowed - lower is better

  // === PENALTIES SECTION (Same as offense) ===
  'penalties': 'asc',             // Penalties Committed - lower is better
  'penalties_yds': 'asc',         // Penalty Yards Committed - lower is better
  'pen_fd': 'asc',                // Penalty 1st Downs Committed - lower is better
  'score_pct': 'asc',             // Opponent Scoring % - lower is better
  'turnover_pct': 'desc',         // Turnover % Forced - higher is better
  'exp_pts_tot': 'asc'            // Expected Points Against - lower is better
};

export async function GET() {
  const requestId = Math.random().toString(36).substr(2, 9);
  const timestamp = new Date().toISOString();
  
  console.log(`🛡️  [DEFENSE-${requestId}] [${timestamp}] Processing request`);
  console.log(`🛡️  [DEFENSE-${requestId}] Environment:`, {
    nodeVersion: process.version,
    platform: process.platform,
    cacheStatus: cache.data ? 'EXISTS' : 'EMPTY',
    cacheAge: cache.timestamp ? Math.round((Date.now() - cache.timestamp) / 1000 / 60) : 'N/A'
  });
  
  try {
    // Check cache first
    const now = Date.now();
    if (cache.data && cache.timestamp && (now - cache.timestamp) < cache.maxAge) {
      const cacheAgeMinutes = Math.round((now - cache.timestamp) / 1000 / 60);
      console.log(`💾 [DEFENSE-${requestId}] Serving cached data (${cacheAgeMinutes} min old)`);
      console.log(`💾 [DEFENSE-${requestId}] Cache contains ${cache.data.rows.length} teams`);
      
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
    console.log(`📁 [DEFENSE-${requestId}] Cache miss - reading fresh data from CSV file...`);
    console.log(`📁 [DEFENSE-${requestId}] File: data/pfr/defense-2025.csv`);
    console.log(`📁 [DEFENSE-${requestId}] Rank basis:`, DEFENSE_RANK_BASIS);
    
    const startTime = Date.now();
    const { updatedAt, rows } = await fetchAndParseCSV({
      type: 'defense'
    });
    const fetchTime = Date.now() - startTime;
    
    console.log(`📊 [DEFENSE-${requestId}] Fetch completed in ${fetchTime}ms`);
    console.log(`📊 [DEFENSE-${requestId}] Raw data: ${rows.length} teams`);
    
    if (rows.length === 0) {
      throw new Error('No team data found in PFR response');
    }

    // Log sample of raw data
    console.log(`📊 [DEFENSE-${requestId}] Sample raw team:`, {
      team: rows[0]?.team,
      availableFields: Object.keys(rows[0] || {}),
      sampleValues: {
        points: rows[0]?.points,
        total_yards: rows[0]?.total_yards,
        pass_yds: rows[0]?.pass_yds
      }
    });

    // Compute rankings
    console.log(`🏆 [DEFENSE-${requestId}] Computing rankings...`);
    const rankStartTime = Date.now();
    console.log(`🐛 [DEFENSE-API-${requestId}] Computing ranks with basis:`, DEFENSE_RANK_BASIS);
    const rowsWithRanks = computeRanks(rows, DEFENSE_RANK_BASIS);
    
    // 🐛 DEBUGGING: Check Pittsburgh Steelers and Tampa Bay Buccaneers ranks after computation
    const debugTeams = rowsWithRanks.filter(team => 
      team.team === 'Pittsburgh Steelers' || team.team === 'Tampa Bay Buccaneers'
    );
    
    if (debugTeams.length > 0) {
      console.log(`🐛 [DEFENSE-API-${requestId}] DEBUG TEAMS AFTER RANK COMPUTATION:`);
      debugTeams.forEach(team => {
        console.log(`   ${team.team}:`);
        console.log(`     points: ${team.points} (rank: ${team.ranks?.points})`);
        console.log(`     total_yards: ${team.total_yards} (rank: ${team.ranks?.total_yards})`);
        console.log(`     All ranks:`, team.ranks);
      });
    }
    const rankTime = Date.now() - rankStartTime;
    
    console.log(`🏆 [DEFENSE-${requestId}] Ranking completed in ${rankTime}ms`);
    console.log(`🏆 [DEFENSE-${requestId}] Sample ranked team:`, {
      team: rowsWithRanks[0]?.team,
      ranks: rowsWithRanks[0]?.ranks
    });

    // Build response object
    const response: ApiResponse = {
      season: 2025,
      type: 'defense',
      updatedAt,
      rankBasis: DEFENSE_RANK_BASIS,
      rows: rowsWithRanks
    };

    // Update cache
    cache = {
      data: response,
      timestamp: now,
      maxAge: cache.maxAge
    };

    console.log(`✅ [DEFENSE-${requestId}] Successfully processed ${rowsWithRanks.length} teams`);
    console.log(`✅ [DEFENSE-${requestId}] Total processing time: ${Date.now() - startTime}ms`);

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
    
    console.error(`❌ [DEFENSE-${requestId}] Error processing request:`, {
      error: errorMessage,
      stack: errorStack,
      type: error instanceof Error ? error.constructor.name : typeof error,
      url: 'https://www.pro-football-reference.com/years/2025/opp.htm#team_stats'
    });

    // If we have stale cache data, serve it with a warning
    if (cache.data) {
      console.log(`🔄 [DEFENSE-${requestId}] Serving stale cache data due to error`);
      console.log(`🔄 [DEFENSE-${requestId}] Stale cache age: ${Math.round((Date.now() - cache.timestamp) / 1000 / 60)} minutes`);
      
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

/**
 * NFL Last-4 Stats API Route Handler (Compare "L4" mode)
 *
 * Each team's last 4 games played, summed into offense + defense rows shaped
 * like the offense/defense routes (`g` = games in the window). The client's
 * per-game transform turns them into averages; ranking stays client-side.
 * Built from the final box scores (lib/last4.ts) — same scoreboards + 24h
 * per-game cache as the defense yards aggregation, so no extra ESPN calls
 * once those are warm.
 */

import { NextResponse } from 'next/server';
import { type TeamStats } from '@/lib/types';
import { getTeamGameLog } from '@/lib/espnStats';
import { buildLast4Rows } from '@/lib/last4';
import { NFL_TEAMS } from '@/lib/teams';
import { APP_CONSTANTS } from '@/config/constants';
import { logger } from '@/utils/logger';
import { generateRequestId } from '@/utils/helpers';
import { createTtlCache } from '@/lib/apiCache';

// ISR: rebuilt in the background every 10 min, like the offense/defense routes.
// Value must be a literal for Next.js static analysis (keep in sync with REVALIDATE_SECONDS).
export const revalidate = 600; // 10 minutes

interface ApiResponse {
  season: number;
  updatedAt: string;
  offense: TeamStats[];
  defense: TeamStats[];
  stale?: boolean;
  error?: string;
}

// Last-good BACKUP only — served via getStale() when ESPN fails, never on the happy path.
const cache = createTtlCache<ApiResponse>(0);

export async function GET() {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // NOTE: getTeamGameLog must not be wrapped in unstable_cache (nested caches are bypassed).
    const { offense, defense } = buildLast4Rows(await getTeamGameLog(), NFL_TEAMS);
    if (offense.length === 0) throw new Error('No last-4 rows (no usable box scores)');

    const response: ApiResponse = {
      season: APP_CONSTANTS.SEASON,
      updatedAt: new Date().toISOString(),
      offense,
      defense,
    };
    cache.set(response);

    logger.performance({ context: 'LAST4', requestId }, 'API Processing Complete', {
      duration: Date.now() - startTime,
      operation: `Built ${offense.length} offense / ${defense.length} defense last-4 rows`,
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'X-Source': 'ESPN',
        'X-Request-ID': requestId,
        'X-Processing-Time': `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ context: 'LAST4', requestId }, `Last-4 build failed: ${msg}`);

    const stale = cache.getStale();
    if (stale) {
      return NextResponse.json({ ...stale, stale: true, error: msg } satisfies ApiResponse, {
        headers: {
          'Cache-Control': 'public, max-age=60',
          'X-Cache': 'STALE',
          'X-Request-ID': requestId,
        },
      });
    }

    // Generic client-facing error — detail is logged above, not leaked.
    return NextResponse.json(
      { error: 'Failed to fetch last-4 data', requestId, timestamp: new Date().toISOString() },
      { status: 500, headers: { 'X-Request-ID': requestId } },
    );
  }
}

/**
 * Weekly player stat lines (Sleeper `api.sleeper.com`, chosen by rule in P0a:
 * every line carries team + opponent) — server-only, shared by all users.
 *
 * Leaders pattern: `unstable_cache` over a no-store fetch with a timeout,
 * throw on empty (never cached), `liveWithLastGood` on top. Completed weeks
 * are cached 24h (stat corrections still land), the in-progress week 30 min.
 * Never call these from inside another unstable_cache (no nesting).
 */
import 'server-only';
import { unstable_cache } from 'next/cache';
import { createTtlCache, liveWithLastGood, type TtlCache } from '@/lib/apiCache';
import type { PlayerGameLine } from '../types';
import { toGameLines, type SleeperComLineRaw } from './map';
import { SLEEPER_STATS_API, sleeperJson } from './http';

const POSITIONS_QS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map((p) => `position[]=${p}`).join('&');
const STATS_TIMEOUT_MS = 8_000;

/** Split / snap / rank keys no league scores — dropped so a week stays small in the cache. */
const NON_SCORING = /^(pos_rank_|tm_|q[1-4]_|h[12]_)|_snp$|^gms_active$|^gs$/;

async function fetchWeekLines(season: number, week: number): Promise<PlayerGameLine[]> {
  const raw = await sleeperJson<SleeperComLineRaw[] | null>(
    `${SLEEPER_STATS_API}/stats/nfl/${season}/${week}?season_type=regular&${POSITIONS_QS}`,
    STATS_TIMEOUT_MS,
  );
  const lines = toGameLines(raw).map((l) => ({
    ...l,
    stats: Object.fromEntries(Object.entries(l.stats).filter(([k]) => !NON_SCORING.test(k))),
  }));
  if (lines.length === 0) throw new Error(`no stat lines for ${season} week ${week}`);
  return lines;
}

const completedWeekLines = unstable_cache(fetchWeekLines, ['myteam-week-lines-final-v1'], {
  revalidate: 24 * 60 * 60,
  tags: ['myteam-week-lines'],
});
const currentWeekLines = unstable_cache(fetchWeekLines, ['myteam-week-lines-live-v1'], {
  revalidate: 30 * 60,
  tags: ['myteam-week-lines'],
});

const backups = new Map<string, TtlCache<PlayerGameLine[]>>();
function backupFor(key: string): TtlCache<PlayerGameLine[]> {
  let b = backups.get(key);
  if (!b) {
    b = createTtlCache<PlayerGameLine[]>(0);
    backups.set(key, b);
  }
  return b;
}

/** One week's lines, or the last good copy, or [] if this server never had one. */
export function getWeekLines(season: number, week: number, completed: boolean): Promise<PlayerGameLine[]> {
  const key = `${season}|${week}`;
  return liveWithLastGood(
    backupFor(key),
    () => (completed ? completedWeekLines : currentWeekLines)(season, week),
    () => [],
    `myteam:lines:w${week}`,
  );
}

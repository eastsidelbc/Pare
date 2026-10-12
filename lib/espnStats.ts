/**
 * ESPN live team-stats fetcher (OFFENSE).
 *
 * Pulls season-TOTAL offense stats for all 32 teams from ESPN's public core API
 * and maps them into the SAME `TeamStats` shape the CSV parser produces, so the
 * ranking / display-mode / bar hooks and the UI stay completely untouched.
 *
 * Endpoint (per team):
 *   https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{SEASON}/types/2/teams/{ESPN_TEAM_ID}/statistics
 *
 * See DATA_SOURCES.md for the field chart. DEFENSE intentionally still uses the
 * CSV path (yards-allowed is a gap in this endpoint) — do not route defense here.
 */

import { unstable_cache } from 'next/cache';
import type { TeamStats, ParseResult } from '@/lib/types';
import { NFL_TEAMS, resolveTeamByAbbr } from '@/lib/teams';
import { getCurrentWeekInfo } from '@/lib/schedule';
import { APP_CONSTANTS } from '@/config/constants';
import { logger } from '@/utils/logger';
import {
  aggregateYardsAllowed,
  parseGameBox,
  toTeamGameLines,
  type EspnSummaryResponse,
  type GameTeamBox,
  type TeamGameLine,
  type YardsAllowed,
} from '@/lib/espnBoxscore';

// ---- ESPN response shape (only the bits we read) ----
interface EspnStat {
  name: string;
  value?: number;
}
interface EspnCategory {
  name: string;
  stats?: EspnStat[];
}
interface EspnStatsResponse {
  splits?: {
    categories?: EspnCategory[];
  };
}

/**
 * Map of app `TeamStats` field → ESPN stat name.
 * Only clean 1:1 season-total mappings. Metrics with no clean ESPN source
 * (e.g. score_pct, penalties, exp_pts_tot) are intentionally omitted and will
 * render as an empty/"—" cell rather than a wrong number.
 */
const ESPN_FIELD_MAP: Record<string, string> = {
  g: 'gamesPlayed',
  points: 'totalPoints',
  // NET yards (sack yardage removed) to match the official / box-score /
  // defense-allowed convention. Gross `totalYards`/`passingYards` differ by
  // `sackYardsLost` and would not equal opponents' defense-allowed totals.
  total_yards: 'netTotalYards',
  pass_yds: 'netPassingYards',
  rush_yds: 'rushingYards',
  pass_cmp: 'completions',
  pass_att: 'passingAttempts',
  pass_td: 'passingTouchdowns',
  pass_int: 'interceptions',
  plays_offense: 'totalOffensivePlays',
  first_down: 'firstDowns',
  rush_att: 'rushingAttempts',
  rush_td: 'rushingTouchdowns',
  fumbles_lost: 'fumblesLost',
  turnovers: 'totalGiveaways',
  third_down_pct: 'thirdDownConvPct',
};

const ESPN_STATS_BASE =
  'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons';

/** Per-team fetch timeout (ms). */
const FETCH_TIMEOUT_MS = 8000;

/**
 * Flattens every category's stats into one name→value lookup.
 * A few stats (e.g. totalPoints) appear in multiple categories with the same
 * value; first occurrence wins.
 */
function flattenStats(data: EspnStatsResponse): Map<string, number> {
  const out = new Map<string, number>();
  const categories = data.splits?.categories ?? [];
  for (const cat of categories) {
    for (const s of cat.stats ?? []) {
      if (typeof s.value === 'number' && !out.has(s.name)) {
        out.set(s.name, s.value);
      }
    }
  }
  return out;
}

/** Fetches + maps one team. Returns null on any failure so callers can degrade. */
async function fetchOneTeam(
  espnId: number,
  teamName: string,
  season: number,
): Promise<TeamStats | null> {
  const url = `${ESPN_STATS_BASE}/${season}/types/2/teams/${espnId}/statistics`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      next: { revalidate: APP_CONSTANTS.CACHE.REVALIDATE_SECONDS },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as EspnStatsResponse;
    const lookup = flattenStats(data);

    const row: TeamStats = { team: teamName };
    // gamesPlayed can also be exposed as teamGamesPlayed — prefer gamesPlayed.
    if (!lookup.has('gamesPlayed') && lookup.has('teamGamesPlayed')) {
      lookup.set('gamesPlayed', lookup.get('teamGamesPlayed')!);
    }

    for (const [field, espnName] of Object.entries(ESPN_FIELD_MAP)) {
      const val = lookup.get(espnName);
      if (typeof val === 'number' && Number.isFinite(val)) {
        // TeamStats values are strings (matches the CSV parser output).
        row[field] = String(val);
      }
    }

    // Require at least the core identity + a couple stats to count as valid.
    if (row.g === undefined || row.points === undefined) {
      throw new Error('missing core stats (g/points)');
    }
    return row;
  } catch (err) {
    logger.error(
      { context: 'ESPN-OFFENSE' },
      `Failed to fetch ${teamName} (id ${espnId}): ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches live offense season totals for all 32 teams from ESPN.
 * Throws if fewer than 32 teams resolve, so the route can fall back to
 * stale cache / CSV. On success returns a `ParseResult` identical in shape to
 * the CSV parser.
 */
export async function fetchOffenseStatsFromESPN(): Promise<ParseResult> {
  const season = APP_CONSTANTS.SEASON;
  logger.debug(
    { context: 'ESPN-OFFENSE' },
    `Fetching ${NFL_TEAMS.length} teams' offense totals for ${season}`,
  );

  const results = await Promise.all(
    NFL_TEAMS.map((t) => fetchOneTeam(t.espnId, t.name, season)),
  );

  const rows = results.filter((r): r is TeamStats => r !== null);

  if (rows.length < NFL_TEAMS.length) {
    throw new Error(
      `ESPN returned ${rows.length}/${NFL_TEAMS.length} teams — treating as failure`,
    );
  }

  return { updatedAt: new Date().toISOString(), rows };
}

// ==========================================================================
//  DEFENSE (points allowed) — ESPN standings
// ==========================================================================

const ESPN_STANDINGS_URL =
  'https://site.api.espn.com/apis/v2/sports/football/nfl/standings';

interface EspnStandingsStat {
  name: string;
  value?: number;
}
interface EspnStandingsEntry {
  team?: { abbreviation?: string };
  stats?: EspnStandingsStat[];
}
interface EspnStandingsChild {
  standings?: { entries?: EspnStandingsEntry[] };
}
interface EspnStandingsResponse {
  children?: EspnStandingsChild[];
}

/**
 * Fetches live 2026 DEFENSE points-allowed for all 32 teams from ESPN standings.
 *
 * Only `points` (← pointsAgainst) and `g` (← wins+losses+ties) are populated.
 * Yards-allowed and other defense "allowed" metrics are intentionally LEFT OFF
 * the row (rendered as "—" by the UI) so we never mix 2026 points with stale
 * 2025 CSV yards. See DATA_SOURCES.md §A — yards-allowed is Step 4.
 *
 * Throws if fewer than 32 teams resolve, so the route can fall back to cache.
 */
export async function fetchDefenseStatsFromESPN(): Promise<ParseResult> {
  const season = APP_CONSTANTS.SEASON;
  logger.debug(
    { context: 'ESPN-DEFENSE' },
    `Fetching standings (points allowed) for ${season}`,
  );

  const url = `${ESPN_STANDINGS_URL}?season=${season}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      next: { revalidate: APP_CONSTANTS.CACHE.REVALIDATE_SECONDS },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as EspnStandingsResponse;

    const getStat = (entry: EspnStandingsEntry, name: string): number | undefined =>
      entry.stats?.find((s) => s.name === name)?.value;

    const rows: TeamStats[] = [];
    for (const child of data.children ?? []) {
      for (const entry of child.standings?.entries ?? []) {
        const espnAbbr = entry.team?.abbreviation;
        if (!espnAbbr) continue;
        const team = resolveTeamByAbbr(espnAbbr);
        if (!team) {
          logger.error(
            { context: 'ESPN-DEFENSE' },
            `Unmapped standings abbreviation: ${espnAbbr}`,
          );
          continue;
        }

        const pointsAgainst = getStat(entry, 'pointsAgainst');
        const wins = getStat(entry, 'wins') ?? 0;
        const losses = getStat(entry, 'losses') ?? 0;
        const ties = getStat(entry, 'ties') ?? 0;
        const games = wins + losses + ties;

        // Only `points` + `g` are live for defense in this step. All other
        // fields are omitted on purpose → UI shows "—".
        const row: TeamStats = { team: team.name };
        if (typeof pointsAgainst === 'number' && Number.isFinite(pointsAgainst)) {
          row.points = String(pointsAgainst);
        }
        row.g = String(games);
        // Overall W-L(-T) record (e.g. "3-0" / "2-1-1") — surfaced in the UI
        // under each selected team. Not a metric, so it never renders as a
        // comparison row; it just rides along on the team row.
        row.record = `${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`;
        rows.push(row);
      }
    }

    if (rows.length < NFL_TEAMS.length) {
      throw new Error(
        `ESPN standings returned ${rows.length}/${NFL_TEAMS.length} teams — treating as failure`,
      );
    }

    return { updatedAt: new Date().toISOString(), rows };
  } finally {
    clearTimeout(timer);
  }
}

// ==========================================================================
//  DEFENSE (yards allowed) — opponent aggregation from game box scores
// ==========================================================================

const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const ESPN_SUMMARY_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary';

/** Summary concurrency cap so we don't hammer ESPN. */
const SUMMARY_BATCH_SIZE = 8;

// Pure parsing + aggregation live in lib/espnBoxscore.ts (unit-tested); this
// file keeps the fetching and the per-game cache.
export type { YardsAllowed, TeamGameLine } from '@/lib/espnBoxscore';

interface EspnScoreboardCompetitor {
  team?: { id?: string };
}
interface EspnScoreboardCompetition {
  status?: { type?: { name?: string } };
  competitors?: EspnScoreboardCompetitor[];
}
interface EspnScoreboardEvent {
  id?: string;
  competitions?: EspnScoreboardCompetition[];
}
interface EspnScoreboardResponse {
  events?: EspnScoreboardEvent[];
}

async function fetchJsonWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      next: { revalidate: APP_CONSTANTS.CACHE.REVALIDATE_SECONDS },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Runs `fn` over `items` in fixed-size parallel batches. */
async function inBatches<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

/** STATUS_FINAL regular-season event IDs for one week. */
async function getFinalEventIds(week: number): Promise<string[]> {
  const url = `${ESPN_SCOREBOARD_URL}?seasontype=2&week=${week}`;
  const data = await fetchJsonWithTimeout<EspnScoreboardResponse>(url);
  const ids: string[] = [];
  for (const ev of data.events ?? []) {
    const comp = ev.competitions?.[0];
    if (comp?.status?.type?.name === 'STATUS_FINAL' && ev.id) {
      ids.push(ev.id);
    }
  }
  return ids;
}

/** Reads both teams' box-score lines from a game summary (null = required yards missing). */
async function fetchGameBox(eventId: string): Promise<GameTeamBox[] | null> {
  const url = `${ESPN_SUMMARY_URL}?event=${eventId}`;
  const data = await fetchJsonWithTimeout<EspnSummaryResponse>(url);
  const { teams, missingTeam } = parseGameBox(data);
  if (!teams && missingTeam) {
    // A required field is missing on this game — skip the whole game.
    logger.error(
      { context: 'DEFENSE-AGG' },
      `Missing box-score yards on event ${eventId} (team ${missingTeam})`,
    );
  }
  return teams;
}

/**
 * Per-game cache for FINISHED games' box scores (~24h).
 *
 * Why: the yards-allowed aggregation used to re-download EVERY box score of the
 * season on each refresh (~16 per finished week, ~270 by Week 18). A final box
 * score is effectively frozen, so each refresh now only downloads games that
 * finished since the last one. 24h (not forever) so the NFL's midweek stat
 * corrections still land. NOTE: this must NOT be called from inside another
 * `unstable_cache` — Next bypasses nested caches (see fetchDefenseYardsAllowed).
 *
 * Incomplete box scores THROW instead of returning null, because
 * `unstable_cache` never stores a thrown error — so a partial box score right at
 * the final whistle is retried next refresh instead of being frozen for 24h.
 *
 * v2 (2026-10-07, My Team): each entry also carries points, TDs by type, INT,
 * sacks, fumbles, turnovers, red-zone trips and drives — new key so old
 * yards-only entries aren't reused.
 */
function getGameBox(eventId: string): Promise<GameTeamBox[]> {
  return unstable_cache(
    async () => {
      const box = await fetchGameBox(eventId);
      if (!box) throw new Error(`incomplete box score for event ${eventId}`);
      return box;
    },
    ['final-boxscore-v2', eventId],
    {
      revalidate: APP_CONSTANTS.CACHE.FINAL_BOXSCORE_REVALIDATE_SECONDS,
      tags: ['final-boxscore-yards'],
    },
  )();
}

/**
 * Every completed regular-season game up to the current week, with its week
 * and both teams' box-score lines (`teams: null` = box score failed/incomplete).
 * Throws only if there are no completed games at all.
 */
async function loadFinalGames(): Promise<Array<{ week: number; eventId: string; teams: GameTeamBox[] | null }>> {
  // Upper bound = current week (completed games only live at or before it).
  let currentWeek: number;
  try {
    currentWeek = (await getCurrentWeekInfo()).week;
  } catch {
    currentWeek = 1;
  }
  currentWeek = Math.max(1, Math.min(18, currentWeek));

  const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1);
  const idLists = await inBatches(weeks, 4, (w) =>
    getFinalEventIds(w).catch((err) => {
      logger.error(
        { context: 'DEFENSE-AGG' },
        `Scoreboard week ${w} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [] as string[];
    }),
  );
  // Keep each event's week (My Team needs per-week logs for "Last 4").
  const events = idLists.flatMap((ids, i) => ids.map((eventId) => ({ eventId, week: weeks[i] })));
  if (events.length === 0) {
    throw new Error('no completed games found for yards aggregation');
  }

  return inBatches(events, SUMMARY_BATCH_SIZE, async ({ eventId, week }) => ({
    week,
    eventId,
    teams: await getGameBox(eventId).catch((err) => {
      logger.error(
        { context: 'DEFENSE-AGG' },
        `Summary ${eventId} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }),
  }));
}

/**
 * Computes each team's yards ALLOWED (total / net-pass / rush) by summing its
 * OPPONENTS' offensive yards across all completed 2026 regular-season games.
 *
 * Returns a map keyed by the app's team name. Teams with no completed games
 * (e.g. a team whose Week 1 game hasn't finished) are simply absent → the UI
 * keeps showing "—" for them. Also logs an internal consistency check
 * (Σ allowed === Σ gained, both from the same box scores) that needs no
 * external source.
 *
 * Throws only if it can't compute anything, so the route can keep serving the
 * Step-3 points-allowed with "—" yards.
 *
 * Internal: returns a plain object; the public API wraps it back into a Map —
 * call site in defense/route.ts unchanged.
 */
async function _fetchDefenseYardsAllowed(): Promise<Record<string, YardsAllowed>> {
  const games = await loadFinalGames();
  const idToName = new Map(NFL_TEAMS.map((t) => [String(t.espnId), t.name]));
  const { allowed, gained, counted, skipped } = aggregateYardsAllowed(
    games.map((g) => g.teams),
    idToName,
  );

  if (counted === 0) {
    throw new Error('no usable game box scores for yards aggregation');
  }

  // Internal consistency: Σ allowed === Σ gained (both from the box scores).
  const a = Object.values(allowed);
  const g = Object.values(gained);
  const aTotal = a.reduce((s, v) => s + v.total_yards, 0);
  const aPass = a.reduce((s, v) => s + v.pass_yds, 0);
  const aRush = a.reduce((s, v) => s + v.rush_yds, 0);
  const gTotal = g.reduce((s, v) => s + v.total, 0);
  const gPass = g.reduce((s, v) => s + v.pass, 0);
  const gRush = g.reduce((s, v) => s + v.rush, 0);

  logger.performance(
    { context: 'DEFENSE-AGG' },
    `Aggregated ${counted} games (skipped ${skipped}), ${a.length} teams. ` +
      `CONSISTENCY allowed/gained → total=${aTotal}/${gTotal} (${aTotal === gTotal ? 'MATCH' : 'MISMATCH'}) ` +
      `pass=${aPass}/${gPass} (${aPass === gPass ? 'MATCH' : 'MISMATCH'}) ` +
      `rush=${aRush}/${gRush} (${aRush === gRush ? 'MATCH' : 'MISMATCH'})`,
  );

  return allowed;
}

/**
 * Public API — unchanged signature so defense/route.ts needs no update.
 *
 * No outer `unstable_cache` here any more: the defense route is already ISR-
 * cached (10 min), and an outer unstable_cache silently DISABLES every cache
 * nested inside it (Next bypasses nested unstable_cache + fetch caching), which
 * forced a full re-download of every season box score on each refresh. Now the
 * week scoreboards use the normal 10-min fetch cache and finished box scores
 * use the 24h per-game cache in getGameBox().
 */
export async function fetchDefenseYardsAllowed(): Promise<Map<string, YardsAllowed>> {
  const obj = await _fetchDefenseYardsAllowed();
  return new Map(Object.entries(obj));
}

/**
 * Per-team, per-week game lines (each team's offense + what it allowed), for
 * My Team's Season / Last-4 windows. Same scoreboards + per-game cache as the
 * yards aggregation — no extra ESPN calls once those are warm. Must not be
 * called from inside an `unstable_cache`.
 */
export async function getTeamGameLog(): Promise<TeamGameLine[]> {
  const games = await loadFinalGames();
  const idToAbbr = new Map(NFL_TEAMS.map((t) => [String(t.espnId), t.abbr]));
  return toTeamGameLines(games, idToAbbr);
}

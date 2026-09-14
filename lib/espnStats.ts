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

import type { TeamStats, ParseResult } from '@/lib/pfrCsv';
import { NFL_TEAMS, getTeamByAbbr } from '@/lib/teams';
import { getCurrentWeekInfo } from '@/lib/schedule';
import { APP_CONSTANTS } from '@/config/constants';
import { logger } from '@/utils/logger';

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
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
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

/**
 * ESPN standings abbreviation → our `lib/teams.ts` abbreviation.
 * Everything not listed is used as-is.
 */
const ESPN_ABBR_ALIASES: Readonly<Record<string, string>> = {
  WSH: 'WAS', // Washington Commanders
};

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
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
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
        const key = espnAbbr.trim().toUpperCase();
        const team = getTeamByAbbr(ESPN_ABBR_ALIASES[key] ?? key);
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

/** Per-team aggregated yards allowed (season totals) + games counted. */
export interface YardsAllowed {
  total_yards: number;
  pass_yds: number;
  rush_yds: number;
  /** Opponent third-down conversions/attempts (for attempts-weighted %). */
  td3Conv: number;
  td3Att: number;
  games: number;
}

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

interface EspnSummaryStat {
  name?: string;
  value?: number;
  displayValue?: string;
}
interface EspnSummaryTeam {
  team?: { id?: string };
  statistics?: EspnSummaryStat[];
}
interface EspnSummaryResponse {
  boxscore?: { teams?: EspnSummaryTeam[] };
}

/** One team's offensive output in a single game. */
interface GameTeamYards {
  teamId: string;
  total: number;
  pass: number;
  rush: number;
  /** Third-down conversions / attempts (from `thirdDownEff`, e.g. "5-12"). */
  td3Conv: number;
  td3Att: number;
}

async function fetchJsonWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
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

/** Reads both teams' offensive total/net-pass/rush yards from a game summary. */
async function getGameYards(eventId: string): Promise<GameTeamYards[] | null> {
  const url = `${ESPN_SUMMARY_URL}?event=${eventId}`;
  const data = await fetchJsonWithTimeout<EspnSummaryResponse>(url);
  const teams = data.boxscore?.teams ?? [];
  if (teams.length !== 2) return null;

  const statVal = (t: EspnSummaryTeam, name: string): number | null => {
    const s = t.statistics?.find((x) => x.name === name);
    if (!s) return null;
    if (typeof s.value === 'number' && Number.isFinite(s.value)) return s.value;
    const n = parseFloat(String(s.displayValue ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  // Parse "conv-att" (e.g. "5-12") from the thirdDownEff entry. Best-effort:
  // a missing/odd value contributes 0/0 (i.e. doesn't skew the % denominator).
  const thirdDown = (t: EspnSummaryTeam): { conv: number; att: number } => {
    const s = t.statistics?.find((x) => x.name === 'thirdDownEff');
    const m = String(s?.displayValue ?? '').match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
    if (!m) return { conv: 0, att: 0 };
    return { conv: parseInt(m[1], 10), att: parseInt(m[2], 10) };
  };

  const out: GameTeamYards[] = [];
  for (const t of teams) {
    const id = t.team?.id;
    const total = statVal(t, 'totalYards');
    const pass = statVal(t, 'netPassingYards');
    const rush = statVal(t, 'rushingYards');
    if (!id || total === null || pass === null || rush === null) {
      // A required field is missing on this game — skip the whole game.
      logger.error(
        { context: 'DEFENSE-AGG' },
        `Missing box-score yards on event ${eventId} (team ${id ?? '?'})`,
      );
      return null;
    }
    const td = thirdDown(t);
    out.push({ teamId: id, total, pass, rush, td3Conv: td.conv, td3Att: td.att });
  }
  return out;
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
 */
export async function fetchDefenseYardsAllowed(): Promise<Map<string, YardsAllowed>> {
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
  const eventIds = idLists.flat();
  if (eventIds.length === 0) {
    throw new Error('no completed games found for yards aggregation');
  }

  const games = await inBatches(eventIds, SUMMARY_BATCH_SIZE, (id) =>
    getGameYards(id).catch((err) => {
      logger.error(
        { context: 'DEFENSE-AGG' },
        `Summary ${id} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }),
  );

  const idToName = new Map(NFL_TEAMS.map((t) => [String(t.espnId), t.name]));
  const allowed = new Map<string, YardsAllowed>();
  const gained = new Map<string, { total: number; pass: number; rush: number }>();

  const ensureAllowed = (name: string): YardsAllowed => {
    let v = allowed.get(name);
    if (!v) {
      v = { total_yards: 0, pass_yds: 0, rush_yds: 0, td3Conv: 0, td3Att: 0, games: 0 };
      allowed.set(name, v);
    }
    return v;
  };
  const ensureGained = (name: string) => {
    let v = gained.get(name);
    if (!v) {
      v = { total: 0, pass: 0, rush: 0 };
      gained.set(name, v);
    }
    return v;
  };

  let counted = 0;
  let skipped = 0;
  for (const g of games) {
    if (!g || g.length !== 2) {
      skipped++;
      continue;
    }
    const [x, y] = g;
    const nameX = idToName.get(x.teamId);
    const nameY = idToName.get(y.teamId);
    if (!nameX || !nameY) {
      skipped++;
      continue;
    }

    // Each team is ALLOWED its opponent's offensive yards + third-down eff.
    const aX = ensureAllowed(nameX);
    aX.total_yards += y.total;
    aX.pass_yds += y.pass;
    aX.rush_yds += y.rush;
    aX.td3Conv += y.td3Conv;
    aX.td3Att += y.td3Att;
    aX.games += 1;

    const aY = ensureAllowed(nameY);
    aY.total_yards += x.total;
    aY.pass_yds += x.pass;
    aY.rush_yds += x.rush;
    aY.td3Conv += x.td3Conv;
    aY.td3Att += x.td3Att;
    aY.games += 1;

    // Each team GAINED its own offensive yards (consistency bookkeeping only).
    const gX = ensureGained(nameX);
    gX.total += x.total;
    gX.pass += x.pass;
    gX.rush += x.rush;
    const gY = ensureGained(nameY);
    gY.total += y.total;
    gY.pass += y.pass;
    gY.rush += y.rush;

    counted++;
  }

  if (counted === 0) {
    throw new Error('no usable game box scores for yards aggregation');
  }

  // Internal consistency: Σ allowed === Σ gained (both from the box scores).
  const aTotal = [...allowed.values()].reduce((s, v) => s + v.total_yards, 0);
  const aPass = [...allowed.values()].reduce((s, v) => s + v.pass_yds, 0);
  const aRush = [...allowed.values()].reduce((s, v) => s + v.rush_yds, 0);
  const gTotal = [...gained.values()].reduce((s, v) => s + v.total, 0);
  const gPass = [...gained.values()].reduce((s, v) => s + v.pass, 0);
  const gRush = [...gained.values()].reduce((s, v) => s + v.rush, 0);

  logger.performance(
    { context: 'DEFENSE-AGG' },
    `Aggregated ${counted} games (skipped ${skipped}), ${allowed.size} teams. ` +
      `CONSISTENCY allowed/gained → total=${aTotal}/${gTotal} (${aTotal === gTotal ? 'MATCH' : 'MISMATCH'}) ` +
      `pass=${aPass}/${gPass} (${aPass === gPass ? 'MATCH' : 'MISMATCH'}) ` +
      `rush=${aRush}/${gRush} (${aRush === gRush ? 'MATCH' : 'MISMATCH'})`,
  );

  return allowed;
}

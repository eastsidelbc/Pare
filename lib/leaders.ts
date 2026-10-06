/**
 * Leaderboards data seam.
 *
 * Turns ESPN's public `byathlete` statistics endpoint into typed `LeaderBoard[]`
 * for the Leaderboards tab. Same free, CORS-open ESPN family the schedule uses;
 * fetched server-side and cached ~6h (see `/api/leaders`), so we never hammer
 * ESPN no matter how many viewers.
 *
 * One ESPN call per board (sorted by that board's stat). Each athlete row comes
 * back with EVERY stat column for its category; we pull the target value by
 * matching the stat key against the response-level `categories[].names` order
 * (per-athlete `values`/`totals`/`ranks` align index-for-index with it), which
 * also hands us the player's league rank for free.
 */
import 'server-only';
import { unstable_cache } from 'next/cache';
import { getFantasyBoards, getRookieIndex } from './fantasy';
import { isRookieRow, type RookieIndex } from './rookieMatch';

/** Public ESPN per-athlete statistics endpoint (free, no key). */
const ESPN_BYATHLETE_URL =
  'https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byathlete';

/** Cache window for a board fetch (6h) — matches the stats cadence. */
const REVALIDATE_SECONDS = 6 * 60 * 60;

/** How many leaders to keep per board (UI shows top N, expand shows the rest). */
const BOARD_LIMIT = 25;

/**
 * Rookie boards scan this deep into ESPN's list, then keep only rookies.
 * The league top 25 has almost no rookies, so we need the long list. 300 covers
 * every rookie with meaningful numbers (ESPN accepts limit up to 1000; checked live).
 */
const ROOKIE_SCAN_LIMIT = 300;

export type LeaderSection =
  | 'offense'
  | 'defense'
  | 'special'
  | 'fantasy'
  | 'rookieOffense'
  | 'rookieDefense'
  | 'rookieSpecial';

/** Which rookie section each stat section's boards land in. */
const ROOKIE_SECTION: Partial<Record<LeaderSection, LeaderSection>> = {
  offense: 'rookieOffense',
  defense: 'rookieDefense',
  special: 'rookieSpecial',
};

/** A single board's identity + how to pull it from ESPN. */
export interface BoardConfig {
  /** Stable key, e.g. "passingYards". */
  key: string;
  /** Display label, e.g. "Passing Yards". */
  label: string;
  section: LeaderSection;
  /** ESPN category name, e.g. "passing" / "defensiveInterceptions". */
  category: string;
  /** ESPN machine stat key within that category, e.g. "passingYards". */
  statKey: string;
}

/** One athlete's line on a board. */
export interface LeaderRow {
  /** League rank for this stat (from ESPN), 1-based. */
  rank: number;
  athleteId: string;
  name: string;
  teamAbbr: string;
  teamLogo: string | null;
  headshot: string | null;
  position: string;
  /** Numeric value (for bar math / sorting). */
  value: number;
  /** ESPN's display string, e.g. "939", "55.6", "8.0". */
  displayValue: string;
  /** Fantasy boards only: the total-points value's per-game counterpart + games. */
  perGame?: number;
  games?: number;
}

export interface LeaderBoard {
  key: string;
  label: string;
  section: LeaderSection;
  leaders: LeaderRow[];
}

/**
 * The boards, in display order. Every sort key here is verified live against
 * ESPN (2026 season) — do not add one without confirming `category.statKey`
 * returns data, or the whole board 400s.
 */
export const BOARDS: readonly BoardConfig[] = [
  // Offense
  { key: 'passingYards', label: 'Passing Yards', section: 'offense', category: 'passing', statKey: 'passingYards' },
  { key: 'passingTouchdowns', label: 'Passing TDs', section: 'offense', category: 'passing', statKey: 'passingTouchdowns' },
  { key: 'rushingYards', label: 'Rushing Yards', section: 'offense', category: 'rushing', statKey: 'rushingYards' },
  { key: 'rushingTouchdowns', label: 'Rushing TDs', section: 'offense', category: 'rushing', statKey: 'rushingTouchdowns' },
  { key: 'receivingYards', label: 'Receiving Yards', section: 'offense', category: 'receiving', statKey: 'receivingYards' },
  { key: 'receivingTouchdowns', label: 'Receiving TDs', section: 'offense', category: 'receiving', statKey: 'receivingTouchdowns' },
  // Defense
  { key: 'sacks', label: 'Sacks', section: 'defense', category: 'defensive', statKey: 'sacks' },
  { key: 'interceptions', label: 'Interceptions', section: 'defense', category: 'defensiveInterceptions', statKey: 'interceptions' },
  { key: 'totalTackles', label: 'Total Tackles', section: 'defense', category: 'defensive', statKey: 'totalTackles' },
  // Special teams
  { key: 'fieldGoalsMade', label: 'Field Goals Made', section: 'special', category: 'kicking', statKey: 'fieldGoalsMade' },
  { key: 'puntAvg', label: 'Punting Avg', section: 'special', category: 'punting', statKey: 'grossAvgPuntYards' },
  { key: 'puntReturnYards', label: 'Punt Return Yards', section: 'special', category: 'returning', statKey: 'puntReturnYards' },
] as const;

// ── Minimal shape of the ESPN byathlete response (only the fields we read) ──
interface EspnResponseCategory {
  name?: string;
  names?: string[];
}
interface EspnAthleteCategory {
  name?: string;
  totals?: string[];
  values?: number[];
  ranks?: string[];
}
interface EspnAthleteRef {
  id?: string | number;
  displayName?: string;
  teamShortName?: string;
  teamLogos?: { href?: string }[];
  headshot?: { href?: string };
  position?: { abbreviation?: string };
}
interface EspnAthleteEntry {
  athlete?: EspnAthleteRef;
  categories?: EspnAthleteCategory[];
}
interface EspnByAthlete {
  categories?: EspnResponseCategory[];
  athletes?: EspnAthleteEntry[];
}

/**
 * Fetch one board's rows from ESPN, sorted by its stat (best first).
 * Throws on any failure so callers decide the fallback.
 */
async function fetchRows(board: BoardConfig, limit: number, init: RequestInit): Promise<LeaderRow[]> {
  const params = new URLSearchParams({
    region: 'us',
    lang: 'en',
    contentorigin: 'espn',
    isqualified: 'false',
    limit: String(limit),
    sort: `${board.category}.${board.statKey}:desc`,
  });
  const url = `${ESPN_BYATHLETE_URL}?${params.toString()}`;

  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`ESPN byathlete HTTP ${res.status}`);
  const data = (await res.json()) as EspnByAthlete;

  // Column index of this stat within its category (per-athlete arrays align to it).
  // Match case-insensitively: the sort key is camelCase (e.g. "defensiveInterceptions")
  // but ESPN returns the category name lowercased (e.g. "defensiveinterceptions").
  const cat_ = board.category.toLowerCase();
  const respCat = data.categories?.find((c) => c.name?.toLowerCase() === cat_);
  const idx = respCat?.names?.indexOf(board.statKey) ?? -1;
  if (idx < 0) throw new Error(`stat "${board.statKey}" not in category "${board.category}"`);

  const leaders: LeaderRow[] = [];
  for (const entry of data.athletes ?? []) {
    const a = entry.athlete;
    const cat = entry.categories?.find((c) => c.name?.toLowerCase() === cat_);
    const value = cat?.values?.[idx];
    if (!a?.displayName || value == null || Number.isNaN(value)) continue;

    leaders.push({
      rank: Number(cat?.ranks?.[idx]) || leaders.length + 1,
      athleteId: a.id != null ? String(a.id) : '',
      name: a.displayName,
      teamAbbr: a.teamShortName ?? '',
      teamLogo: a.teamLogos?.[0]?.href ?? null,
      headshot: a.headshot?.href ?? null,
      position: a.position?.abbreviation ?? '',
      value,
      displayValue: cat?.totals?.[idx] ?? String(value),
    });
  }
  return leaders;
}

/** Fetch + map a single board from ESPN. Returns an empty board on any failure. */
async function fetchBoard(board: BoardConfig): Promise<LeaderBoard> {
  try {
    const leaders = await fetchRows(board, BOARD_LIMIT, { next: { revalidate: REVALIDATE_SECONDS } });
    return { key: board.key, label: board.label, section: board.section, leaders };
  } catch (err) {
    console.error(`❌ [leaders] "${board.key}" fetch failed:`, err);
    return { key: board.key, label: board.label, section: board.section, leaders: [] };
  }
}

/**
 * The deep (300-row) list for one board, trimmed and cached as the SMALL result.
 * The raw ESPN response at this depth is large, so — same pattern as the Sleeper
 * player map — we fetch it raw (no-store) and let `unstable_cache` hold the trimmed
 * rows for the same 6h window as the other boards. A failure or an empty list throws,
 * so nothing bad gets cached.
 */
const getDeepRows = unstable_cache(
  async (boardKey: string): Promise<LeaderRow[]> => {
    const board = BOARDS.find((b) => b.key === boardKey);
    if (!board) return [];
    const rows = await fetchRows(board, ROOKIE_SCAN_LIMIT, { cache: 'no-store' });
    if (rows.length === 0) throw new Error('empty list');
    // Drop image URLs (unused on Leaders) to keep the cached copy small.
    return rows.map((r) => ({ ...r, teamLogo: null, headshot: null }));
  },
  ['leaders-deep-rows-v1'],
  { revalidate: REVALIDATE_SECONDS, tags: ['leaders-deep-rows'] }
);

/** One rookie board: the deep list filtered to rookies, top 25. Empty on failure. */
async function fetchRookieBoard(board: BoardConfig, rookies: RookieIndex): Promise<LeaderBoard> {
  const section = ROOKIE_SECTION[board.section] ?? board.section;
  const key = `rookie-${board.key}`;
  try {
    const rows = await getDeepRows(board.key);
    const leaders = rows
      .filter((r) => isRookieRow(rookies, r))
      .slice(0, BOARD_LIMIT)
      .map((r, i) => ({ ...r, rank: i + 1 }));
    return { key, label: board.label, section, leaders };
  } catch (err) {
    console.error(`❌ [leaders] rookie "${board.key}" fetch failed:`, err);
    return { key, label: board.label, section, leaders: [] };
  }
}

/** Rookie versions of every stat board. No rookie list (Sleeper down) → none. */
async function getRookieBoards(): Promise<LeaderBoard[]> {
  const rookies = await getRookieIndex();
  if (rookies.nameTeam.size === 0 && rookies.espnIds.size === 0) return [];
  return Promise.all(BOARDS.map((b) => fetchRookieBoard(b, rookies)));
}

/** All boards (stat + fantasy + rookie), fetched in parallel. Failures degrade to empty boards. */
export async function getAllLeaderboards(): Promise<LeaderBoard[]> {
  const [statBoards, fantasyBoards, rookieBoards] = await Promise.all([
    Promise.all(BOARDS.map(fetchBoard)),
    getFantasyBoards(),
    getRookieBoards(),
  ]);
  return [...statBoards, ...fantasyBoards, ...rookieBoards];
}

/**
 * Team identity registry — single source of truth for NFL team abbreviations,
 * full names, and short display labels.
 *
 * The FULL NAME is the app's canonical selection key (matches CSV `team` values
 * and the logo map in `components/TeamLogo.tsx`). Abbreviations are used in URLs
 * (e.g. `/compare?away=BUF&home=BAL`) and compact UI badges.
 */

/** NFL conference. */
export type Conference = 'AFC' | 'NFC';
/** Division within a conference. */
export type Division = 'East' | 'North' | 'South' | 'West';

export interface NflTeam {
  /** Standard PFR-style abbreviation, e.g. "BAL". Used in URLs + compact badges. */
  abbr: string;
  /** Canonical full name, e.g. "Baltimore Ravens". App selection key + logo key. */
  name: string;
  /** City / short label, e.g. "Baltimore". */
  location: string;
  /** Nickname, e.g. "Ravens". */
  nickname: string;
  /** ESPN franchise id (for the ESPN stats endpoint). See DATA_SOURCES.md. */
  espnId: number;
  /** Conference — static, never changes. Used to group the Standings tab. */
  conference: Conference;
  /** Division — static, never changes. Used to group the Standings tab. */
  division: Division;
}

/**
 * All 32 teams. `name` MUST match the CSV `team` field and the TeamLogo map.
 * `espnId` values are from ESPN's franchise id map (DATA_SOURCES.md §3).
 */
export const NFL_TEAMS: readonly NflTeam[] = [
  { abbr: 'ARI', name: 'Arizona Cardinals', location: 'Arizona', nickname: 'Cardinals', espnId: 22, conference: 'NFC', division: 'West' },
  { abbr: 'ATL', name: 'Atlanta Falcons', location: 'Atlanta', nickname: 'Falcons', espnId: 1, conference: 'NFC', division: 'South' },
  { abbr: 'BAL', name: 'Baltimore Ravens', location: 'Baltimore', nickname: 'Ravens', espnId: 33, conference: 'AFC', division: 'North' },
  { abbr: 'BUF', name: 'Buffalo Bills', location: 'Buffalo', nickname: 'Bills', espnId: 2, conference: 'AFC', division: 'East' },
  { abbr: 'CAR', name: 'Carolina Panthers', location: 'Carolina', nickname: 'Panthers', espnId: 29, conference: 'NFC', division: 'South' },
  { abbr: 'CHI', name: 'Chicago Bears', location: 'Chicago', nickname: 'Bears', espnId: 3, conference: 'NFC', division: 'North' },
  { abbr: 'CIN', name: 'Cincinnati Bengals', location: 'Cincinnati', nickname: 'Bengals', espnId: 4, conference: 'AFC', division: 'North' },
  { abbr: 'CLE', name: 'Cleveland Browns', location: 'Cleveland', nickname: 'Browns', espnId: 5, conference: 'AFC', division: 'North' },
  { abbr: 'DAL', name: 'Dallas Cowboys', location: 'Dallas', nickname: 'Cowboys', espnId: 6, conference: 'NFC', division: 'East' },
  { abbr: 'DEN', name: 'Denver Broncos', location: 'Denver', nickname: 'Broncos', espnId: 7, conference: 'AFC', division: 'West' },
  { abbr: 'DET', name: 'Detroit Lions', location: 'Detroit', nickname: 'Lions', espnId: 8, conference: 'NFC', division: 'North' },
  { abbr: 'GB', name: 'Green Bay Packers', location: 'Green Bay', nickname: 'Packers', espnId: 9, conference: 'NFC', division: 'North' },
  { abbr: 'HOU', name: 'Houston Texans', location: 'Houston', nickname: 'Texans', espnId: 34, conference: 'AFC', division: 'South' },
  { abbr: 'IND', name: 'Indianapolis Colts', location: 'Indianapolis', nickname: 'Colts', espnId: 11, conference: 'AFC', division: 'South' },
  { abbr: 'JAX', name: 'Jacksonville Jaguars', location: 'Jacksonville', nickname: 'Jaguars', espnId: 30, conference: 'AFC', division: 'South' },
  { abbr: 'KC', name: 'Kansas City Chiefs', location: 'Kansas City', nickname: 'Chiefs', espnId: 12, conference: 'AFC', division: 'West' },
  { abbr: 'LV', name: 'Las Vegas Raiders', location: 'Las Vegas', nickname: 'Raiders', espnId: 13, conference: 'AFC', division: 'West' },
  { abbr: 'LAC', name: 'Los Angeles Chargers', location: 'Los Angeles', nickname: 'Chargers', espnId: 24, conference: 'AFC', division: 'West' },
  { abbr: 'LAR', name: 'Los Angeles Rams', location: 'Los Angeles', nickname: 'Rams', espnId: 14, conference: 'NFC', division: 'West' },
  { abbr: 'MIA', name: 'Miami Dolphins', location: 'Miami', nickname: 'Dolphins', espnId: 15, conference: 'AFC', division: 'East' },
  { abbr: 'MIN', name: 'Minnesota Vikings', location: 'Minnesota', nickname: 'Vikings', espnId: 16, conference: 'NFC', division: 'North' },
  { abbr: 'NE', name: 'New England Patriots', location: 'New England', nickname: 'Patriots', espnId: 17, conference: 'AFC', division: 'East' },
  { abbr: 'NO', name: 'New Orleans Saints', location: 'New Orleans', nickname: 'Saints', espnId: 18, conference: 'NFC', division: 'South' },
  { abbr: 'NYG', name: 'New York Giants', location: 'New York', nickname: 'Giants', espnId: 19, conference: 'NFC', division: 'East' },
  { abbr: 'NYJ', name: 'New York Jets', location: 'New York', nickname: 'Jets', espnId: 20, conference: 'AFC', division: 'East' },
  { abbr: 'PHI', name: 'Philadelphia Eagles', location: 'Philadelphia', nickname: 'Eagles', espnId: 21, conference: 'NFC', division: 'East' },
  { abbr: 'PIT', name: 'Pittsburgh Steelers', location: 'Pittsburgh', nickname: 'Steelers', espnId: 23, conference: 'AFC', division: 'North' },
  { abbr: 'SF', name: 'San Francisco 49ers', location: 'San Francisco', nickname: '49ers', espnId: 25, conference: 'NFC', division: 'West' },
  { abbr: 'SEA', name: 'Seattle Seahawks', location: 'Seattle', nickname: 'Seahawks', espnId: 26, conference: 'NFC', division: 'West' },
  { abbr: 'TB', name: 'Tampa Bay Buccaneers', location: 'Tampa Bay', nickname: 'Buccaneers', espnId: 27, conference: 'NFC', division: 'South' },
  { abbr: 'TEN', name: 'Tennessee Titans', location: 'Tennessee', nickname: 'Titans', espnId: 10, conference: 'AFC', division: 'South' },
  { abbr: 'WAS', name: 'Washington Commanders', location: 'Washington', nickname: 'Commanders', espnId: 28, conference: 'NFC', division: 'East' },
] as const;

const BY_ABBR: ReadonlyMap<string, NflTeam> = new Map(
  NFL_TEAMS.map((team) => [team.abbr, team]),
);

const BY_NAME: ReadonlyMap<string, NflTeam> = new Map(
  NFL_TEAMS.map((team) => [team.name, team]),
);

/** Look up a team by its abbreviation (case-insensitive). */
export function getTeamByAbbr(abbr: string | null | undefined): NflTeam | null {
  if (!abbr) return null;
  return BY_ABBR.get(abbr.trim().toUpperCase()) ?? null;
}

/** Look up a team by its canonical full name. */
export function getTeamByName(name: string | null | undefined): NflTeam | null {
  if (!name) return null;
  return BY_NAME.get(name.trim()) ?? null;
}

/** Resolve an abbreviation to a full team name, or null if unknown. */
export function abbrToTeamName(abbr: string | null | undefined): string | null {
  return getTeamByAbbr(abbr)?.name ?? null;
}

/** Resolve a full team name to its abbreviation, or null if unknown. */
export function teamNameToAbbr(name: string | null | undefined): string | null {
  return getTeamByName(name)?.abbr ?? null;
}

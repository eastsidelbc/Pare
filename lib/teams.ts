/**
 * Team identity registry — single source of truth for NFL team abbreviations,
 * full names, and short display labels.
 *
 * The FULL NAME is the app's canonical selection key (matches CSV `team` values
 * and the logo map in `components/TeamLogo.tsx`). Abbreviations are used in URLs
 * (e.g. `/compare?away=BUF&home=BAL`) and compact UI badges.
 */

export interface NflTeam {
  /** Standard PFR-style abbreviation, e.g. "BAL". Used in URLs + compact badges. */
  abbr: string;
  /** Canonical full name, e.g. "Baltimore Ravens". App selection key + logo key. */
  name: string;
  /** City / short label, e.g. "Baltimore". */
  location: string;
  /** Nickname, e.g. "Ravens". */
  nickname: string;
}

/**
 * All 32 teams. `name` MUST match the CSV `team` field and the TeamLogo map.
 */
export const NFL_TEAMS: readonly NflTeam[] = [
  { abbr: 'ARI', name: 'Arizona Cardinals', location: 'Arizona', nickname: 'Cardinals' },
  { abbr: 'ATL', name: 'Atlanta Falcons', location: 'Atlanta', nickname: 'Falcons' },
  { abbr: 'BAL', name: 'Baltimore Ravens', location: 'Baltimore', nickname: 'Ravens' },
  { abbr: 'BUF', name: 'Buffalo Bills', location: 'Buffalo', nickname: 'Bills' },
  { abbr: 'CAR', name: 'Carolina Panthers', location: 'Carolina', nickname: 'Panthers' },
  { abbr: 'CHI', name: 'Chicago Bears', location: 'Chicago', nickname: 'Bears' },
  { abbr: 'CIN', name: 'Cincinnati Bengals', location: 'Cincinnati', nickname: 'Bengals' },
  { abbr: 'CLE', name: 'Cleveland Browns', location: 'Cleveland', nickname: 'Browns' },
  { abbr: 'DAL', name: 'Dallas Cowboys', location: 'Dallas', nickname: 'Cowboys' },
  { abbr: 'DEN', name: 'Denver Broncos', location: 'Denver', nickname: 'Broncos' },
  { abbr: 'DET', name: 'Detroit Lions', location: 'Detroit', nickname: 'Lions' },
  { abbr: 'GB', name: 'Green Bay Packers', location: 'Green Bay', nickname: 'Packers' },
  { abbr: 'HOU', name: 'Houston Texans', location: 'Houston', nickname: 'Texans' },
  { abbr: 'IND', name: 'Indianapolis Colts', location: 'Indianapolis', nickname: 'Colts' },
  { abbr: 'JAX', name: 'Jacksonville Jaguars', location: 'Jacksonville', nickname: 'Jaguars' },
  { abbr: 'KC', name: 'Kansas City Chiefs', location: 'Kansas City', nickname: 'Chiefs' },
  { abbr: 'LV', name: 'Las Vegas Raiders', location: 'Las Vegas', nickname: 'Raiders' },
  { abbr: 'LAC', name: 'Los Angeles Chargers', location: 'Los Angeles', nickname: 'Chargers' },
  { abbr: 'LAR', name: 'Los Angeles Rams', location: 'Los Angeles', nickname: 'Rams' },
  { abbr: 'MIA', name: 'Miami Dolphins', location: 'Miami', nickname: 'Dolphins' },
  { abbr: 'MIN', name: 'Minnesota Vikings', location: 'Minnesota', nickname: 'Vikings' },
  { abbr: 'NE', name: 'New England Patriots', location: 'New England', nickname: 'Patriots' },
  { abbr: 'NO', name: 'New Orleans Saints', location: 'New Orleans', nickname: 'Saints' },
  { abbr: 'NYG', name: 'New York Giants', location: 'New York', nickname: 'Giants' },
  { abbr: 'NYJ', name: 'New York Jets', location: 'New York', nickname: 'Jets' },
  { abbr: 'PHI', name: 'Philadelphia Eagles', location: 'Philadelphia', nickname: 'Eagles' },
  { abbr: 'PIT', name: 'Pittsburgh Steelers', location: 'Pittsburgh', nickname: 'Steelers' },
  { abbr: 'SF', name: 'San Francisco 49ers', location: 'San Francisco', nickname: '49ers' },
  { abbr: 'SEA', name: 'Seattle Seahawks', location: 'Seattle', nickname: 'Seahawks' },
  { abbr: 'TB', name: 'Tampa Bay Buccaneers', location: 'Tampa Bay', nickname: 'Buccaneers' },
  { abbr: 'TEN', name: 'Tennessee Titans', location: 'Tennessee', nickname: 'Titans' },
  { abbr: 'WAS', name: 'Washington Commanders', location: 'Washington', nickname: 'Commanders' },
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

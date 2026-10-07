/**
 * My Team — normalized types shared by providers, engines and UI.
 *
 * The UI only ever sees these shapes; provider adapters (lib/myteam/sleeper/*)
 * map raw API responses into them. Stat keys use Sleeper's stat vocabulary
 * (sportradar-derived: `pass_yd`, `rec`, `rush_td`, `pts_allow_0`, …) because
 * weekly stat lines come from Sleeper; a future ESPN/Yahoo league provider
 * maps its scoring settings into the same keys.
 * Plan: docs/plans/my-team-fantasy.md.
 */

/** Positions My Team rates. Sleeper calls D/ST "DEF". */
export const FANTASY_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const;
export type FantasyPosition = (typeof FANTASY_POSITIONS)[number];

export function isFantasyPosition(v: unknown): v is FantasyPosition {
  return typeof v === 'string' && (FANTASY_POSITIONS as readonly string[]).includes(v);
}

export type ProviderId = 'sleeper';

export interface FantasyUser {
  provider: ProviderId;
  userId: string;
  username: string;
  displayName: string;
}

export type LeagueStatus = 'pre_draft' | 'drafting' | 'in_season' | 'complete';

export interface FantasyLeague {
  provider: ProviderId;
  leagueId: string;
  name: string;
  season: number;
  status: LeagueStatus;
  totalRosters: number;
}

/** Normalized stat key → fantasy points per unit (0-weight keys omitted). */
export type ScoringRules = Readonly<Record<string, number>>;

export interface LeagueDetail extends FantasyLeague {
  scoring: ScoringRules;
  /** Stable hash of `scoring` — leagues with identical scoring share an FPA table. */
  scoringHash: string;
  /** Starter slots in order (QB, RB, FLEX, SUPER_FLEX, …); bench slots excluded. */
  rosterSlots: string[];
  playoffWeekStart: number | null;
}

export type InjuryTag = 'Q' | 'D' | 'O' | 'IR';
export type RosterGroup = 'starter' | 'bench' | 'ir' | 'taxi';

export interface RosterPlayer {
  playerId: string;
  name: string;
  /** null = a position My Team doesn't rate (e.g. IDP). */
  position: FantasyPosition | null;
  /** NFL team abbreviation (lib/teams aliases applied); null = free agent. */
  nflTeam: string | null;
  group: RosterGroup;
  /** Starter slot label (e.g. "FLEX") for starters, else null. */
  slot: string | null;
  injury: InjuryTag | null;
}

export interface FantasyRoster {
  rosterId: number;
  players: RosterPlayer[];
  /** League hasn't drafted yet — show the pre-draft state, not an empty roster. */
  preDraft: boolean;
}

/** One player's stat line for one game. */
export type StatLine = Readonly<Record<string, number>>;

export interface PlayerGameLine {
  playerId: string;
  position: FantasyPosition;
  /** The player's NFL team that week (team-at-week, so trades are handled). */
  team: string;
  /** The team he played against that week. */
  opponent: string;
  week: number;
  stats: StatLine;
}

/** Season-to-date or the last 4 games each team actually played (byes skipped). */
export type RatingWindow = 'season' | 'last4';

export type MatchupTier = 'great' | 'good' | 'avg' | 'tough' | 'avoid';

export interface LivePoints {
  week: number;
  /** My roster's total (Sleeper's `points`, league scoring). */
  total: number;
  byPlayer: Readonly<Record<string, number>>;
}

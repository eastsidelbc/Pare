/**
 * Schedule data seam.
 *
 * `getCurrentWeekMatchups()` returns the current NFL week's matchups as a typed
 * array. It fetches live from ESPN's free public scoreboard API (server-side,
 * cached ~1h). If that fails or returns nothing, it falls back to a hardcoded
 * week so the home page never blanks.
 *
 * Only the INSIDE of this seam knows about ESPN — the `Matchup` shape and every
 * downstream consumer are unchanged. The pure ESPN → `Matchup[]` mapping lives
 * in `lib/espnScoreboard.ts` so the client-side live-score poll shares it.
 */

import { getTeamByAbbr, type NflTeam } from './teams';
import { APP_CONSTANTS } from '@/config/constants';
import {
  mapEspnScoreboard,
  ESPN_SCOREBOARD_URL,
  type EspnScoreboard,
} from './espnScoreboard';

/** Game lifecycle, mirrors ESPN `status.type.state`. */
export type GameState = 'pre' | 'in' | 'post';

/** Betting line for an upcoming game (from ESPN `odds[0]`). */
export interface MatchupOdds {
  /** Spread details string, e.g. "KC -2.5". */
  spread: string;
  /** Over/under total, e.g. 42.5. `null` when not provided. */
  overUnder: number | null;
}

/** A single scheduled game. `away` plays AT `home`. */
export interface Matchup {
  /** Stable id, e.g. "2025-w3-BUF-BAL". */
  id: string;
  /** NFL week number (1–18 regular season). */
  week: number;
  /** Visiting team. */
  away: NflTeam;
  /** Home team. */
  home: NflTeam;
  /** Kickoff time (absolute instant). */
  kickoff: Date;
  /** Lifecycle state (`pre` = upcoming, `in` = live, `post` = final). */
  state: GameState;
  /** Convenience: true when the game is final. */
  completed: boolean;
  /** Short status label, e.g. "Final" or "Q3 5:20" (ESPN `shortDetail`). */
  statusDetail: string;
  /** Away/home scores when live or final, else `null`. */
  awayScore: number | null;
  homeScore: number | null;
  /** Winning side for completed games, else `null`. */
  winner: 'away' | 'home' | null;
  /** Pre-game betting line, else `null`. */
  odds: MatchupOdds | null;
}

/** Raw, source-agnostic matchup shape. This is what a real feed would provide. */
interface RawMatchup {
  awayAbbr: string;
  homeAbbr: string;
  /** ISO 8601 kickoff, e.g. "2025-09-21T13:00:00-04:00". */
  kickoff: string;
}

/** Fallback week number, used only when the live fetch fails. */
const CURRENT_WEEK = 3;

/**
 * Hardcoded fallback week (all 32 teams, 16 games). Returned only if the ESPN
 * fetch fails or yields no usable games, so the home page never blanks.
 * Times are US Eastern (kept as offset-qualified ISO so they're unambiguous).
 */
const FALLBACK_WEEK: readonly RawMatchup[] = [
  // Thursday Night Football
  { awayAbbr: 'MIA', homeAbbr: 'BUF', kickoff: '2025-09-18T20:15:00-04:00' },
  // Sunday early window
  { awayAbbr: 'ATL', homeAbbr: 'CAR', kickoff: '2025-09-21T13:00:00-04:00' },
  { awayAbbr: 'GB', homeAbbr: 'CLE', kickoff: '2025-09-21T13:00:00-04:00' },
  { awayAbbr: 'HOU', homeAbbr: 'JAX', kickoff: '2025-09-21T13:00:00-04:00' },
  { awayAbbr: 'CIN', homeAbbr: 'MIN', kickoff: '2025-09-21T13:00:00-04:00' },
  { awayAbbr: 'PIT', homeAbbr: 'NE', kickoff: '2025-09-21T13:00:00-04:00' },
  { awayAbbr: 'LAR', homeAbbr: 'PHI', kickoff: '2025-09-21T13:00:00-04:00' },
  { awayAbbr: 'NYJ', homeAbbr: 'TB', kickoff: '2025-09-21T13:00:00-04:00' },
  { awayAbbr: 'IND', homeAbbr: 'TEN', kickoff: '2025-09-21T13:00:00-04:00' },
  // Sunday late window
  { awayAbbr: 'DEN', homeAbbr: 'LAC', kickoff: '2025-09-21T16:05:00-04:00' },
  { awayAbbr: 'NO', homeAbbr: 'SEA', kickoff: '2025-09-21T16:05:00-04:00' },
  { awayAbbr: 'DAL', homeAbbr: 'CHI', kickoff: '2025-09-21T16:25:00-04:00' },
  { awayAbbr: 'ARI', homeAbbr: 'SF', kickoff: '2025-09-21T16:25:00-04:00' },
  // Sunday Night Football
  { awayAbbr: 'KC', homeAbbr: 'NYG', kickoff: '2025-09-21T20:20:00-04:00' },
  // Monday Night Football
  { awayAbbr: 'DET', homeAbbr: 'BAL', kickoff: '2025-09-22T20:15:00-04:00' },
  { awayAbbr: 'LV', homeAbbr: 'WAS', kickoff: '2025-09-22T20:15:00-04:00' },
];

/** Convert a raw source matchup into a resolved, typed `Matchup`. */
function toMatchup(raw: RawMatchup, week: number): Matchup | null {
  const away = getTeamByAbbr(raw.awayAbbr);
  const home = getTeamByAbbr(raw.homeAbbr);
  if (!away || !home) return null;

  return {
    id: `${new Date(raw.kickoff).getFullYear()}-w${week}-${away.abbr}-${home.abbr}`,
    week,
    away,
    home,
    kickoff: new Date(raw.kickoff),
    // Fallback games are always treated as upcoming with no scores/odds.
    state: 'pre',
    completed: false,
    statusDetail: '',
    awayScore: null,
    homeScore: null,
    winner: null,
    odds: null,
  };
}

/** Regular-season week bounds. */
export const MIN_WEEK = 1;
export const MAX_WEEK = 18;

/** Build the hardcoded fallback week as `Matchup[]`. */
function getFallbackMatchups(): Matchup[] {
  return FALLBACK_WEEK.map((raw) => toMatchup(raw, CURRENT_WEEK))
    .filter((m): m is Matchup => m !== null)
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
}

/** Fetch + parse an ESPN scoreboard payload (throws on HTTP error). */
async function fetchScoreboard(url: string): Promise<EspnScoreboard> {
  const res = await fetch(url, { next: { revalidate: APP_CONSTANTS.CACHE.REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`ESPN scoreboard HTTP ${res.status}`);
  return (await res.json()) as EspnScoreboard;
}

/**
 * Current week + season, detected from ESPN's default scoreboard (never
 * hardcoded). Falls back to {@link CURRENT_WEEK} / this year on failure.
 * Server-side only.
 */
export async function getCurrentWeekInfo(): Promise<{ week: number; season: number }> {
  try {
    const data = await fetchScoreboard(ESPN_SCOREBOARD_URL);
    return {
      week: data.week?.number ?? CURRENT_WEEK,
      season: data.season?.year ?? new Date().getFullYear(),
    };
  } catch (err) {
    console.error('❌ [schedule] Current-week detection failed — using fallback:', err);
    return { week: CURRENT_WEEK, season: new Date().getFullYear() };
  }
}

/**
 * Matchups for a specific regular-season week (`seasontype=2&week=N`), ordered
 * by kickoff. Returns `[]` on failure or empty week (UI shows an empty state, no
 * blank). Server-side only.
 */
export async function getMatchupsForWeek(week: number): Promise<Matchup[]> {
  const clamped = Math.min(MAX_WEEK, Math.max(MIN_WEEK, Math.trunc(week)));
  const url = `${ESPN_SCOREBOARD_URL}?seasontype=2&week=${clamped}`;
  try {
    const data = await fetchScoreboard(url);
    return mapEspnScoreboard(data, clamped);
  } catch (err) {
    console.error(`❌ [schedule] Week ${clamped} fetch failed:`, err);
    return [];
  }
}

/**
 * Returns the current NFL week's matchups, ordered by kickoff time.
 *
 * Fetches live from ESPN (server-side, cached ~1h). Falls back to
 * {@link getFallbackMatchups} on any failure so the UI never blanks.
 * Must be called server-side (uses Next fetch caching + avoids CORS).
 */
export async function getCurrentWeekMatchups(): Promise<Matchup[]> {
  try {
    const data = await fetchScoreboard(ESPN_SCOREBOARD_URL);
    const matchups = mapEspnScoreboard(data, CURRENT_WEEK);
    if (matchups.length === 0) throw new Error('ESPN scoreboard returned no usable games');

    return matchups;
  } catch (err) {
    console.error('❌ [schedule] Live schedule fetch failed — using fallback week:', err);
    return getFallbackMatchups();
  }
}

/** Fallback week number (only meaningful when the live fetch fails). */
export function getCurrentWeekNumber(): number {
  return CURRENT_WEEK;
}

/**
 * Format a kickoff into a compact `{ day, time }` label pair for the UI, e.g.
 * `{ day: "Sun", time: "1:00 PM" }`. Rendered in the user's local timezone.
 */
export function formatKickoff(kickoff: Date): { day: string; time: string } {
  const day = kickoff.toLocaleDateString('en-US', { weekday: 'short' });
  const time = kickoff
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .replace(/\s/g, ' ');
  return { day, time };
}

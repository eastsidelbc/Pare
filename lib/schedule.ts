/**
 * Schedule data seam.
 *
 * `getCurrentWeekMatchups()` returns the current NFL week's matchups as a typed
 * array. It is CURRENTLY backed by a hardcoded mock — no live fetching yet.
 *
 * A real data source (ESPN / PFR schedule endpoint, a cron-refreshed JSON blob,
 * etc.) can drop in behind this function later WITHOUT touching the UI: just
 * replace the body of `getCurrentWeekMatchups()` so it returns `Matchup[]`.
 */

import { getTeamByAbbr, type NflTeam } from './teams';

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
}

/** Raw, source-agnostic matchup shape. This is what a real feed would provide. */
interface RawMatchup {
  awayAbbr: string;
  homeAbbr: string;
  /** ISO 8601 kickoff, e.g. "2025-09-21T13:00:00-04:00". */
  kickoff: string;
}

/** Current mock week number. */
const CURRENT_WEEK = 3;

/**
 * Hardcoded mock of a full NFL week (all 32 teams, 16 games).
 * Times are US Eastern (kept as offset-qualified ISO so they're unambiguous).
 */
const MOCK_WEEK: readonly RawMatchup[] = [
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
  };
}

/**
 * Returns the current NFL week's matchups, ordered by kickoff time.
 *
 * TEMPORARY: backed by {@link MOCK_WEEK}. Swap the body for a real fetch later.
 */
export function getCurrentWeekMatchups(): Matchup[] {
  return MOCK_WEEK.map((raw) => toMatchup(raw, CURRENT_WEEK))
    .filter((m): m is Matchup => m !== null)
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
}

/** The week number currently returned by {@link getCurrentWeekMatchups}. */
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

/**
 * Schedule data seam.
 *
 * `getCurrentWeekMatchups()` returns the current NFL week's matchups as a typed
 * array. It fetches live from ESPN's free public scoreboard API (server-side,
 * cached ~5 min — LIVE_REVALIDATE_SECONDS). If that fails or returns nothing, it falls back to a hardcoded
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
  /** Away team's overall W-L(-T) record, e.g. "3-0". `null` when unknown/fallback. */
  awayRecord: string | null;
  /** Home team's overall W-L(-T) record, e.g. "3-0". `null` when unknown/fallback. */
  homeRecord: string | null;
  /** Broadcast network, e.g. "FOX" / "CBS" / "Prime". Pre-game only; `null` otherwise. */
  network: string | null;
  /** ESPN event id, for the post-game box-score lookup. `null` for fallback games. */
  espnEventId: string | null;
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
    awayRecord: null,
    homeRecord: null,
    network: null,
    espnEventId: null,
  };
}

/** Regular-season week bounds. */
export const MIN_WEEK = 1;
export const MAX_WEEK = 18;

/**
 * Static regular-season week date ranges (game span, Central time), shown under
 * each week in the dropdown. Baked from the 2026 ESPN schedule so the dropdown
 * needs no per-week fetch. Week 18 is a single placeholder day until the NFL
 * sets its exact dates.
 */
export const WEEK_DATE_RANGES: Readonly<Record<number, string>> = {
  1: '9/9 – 9/14',
  2: '9/17 – 9/21',
  3: '9/24 – 9/28',
  4: '10/1 – 10/5',
  5: '10/8 – 10/12',
  6: '10/15 – 10/19',
  7: '10/22 – 10/26',
  8: '10/29 – 11/2',
  9: '11/5 – 11/9',
  10: '11/12 – 11/16',
  11: '11/19 – 11/23',
  12: '11/25 – 11/30',
  13: '12/3 – 12/7',
  14: '12/10 – 12/14',
  15: '12/17 – 12/21',
  16: '12/24 – 12/28',
  17: '12/31 – 1/4',
  18: '1/9',
};

/** Build the hardcoded fallback week as `Matchup[]`. */
function getFallbackMatchups(): Matchup[] {
  return FALLBACK_WEEK.map((raw) => toMatchup(raw, CURRENT_WEEK))
    .filter((m): m is Matchup => m !== null)
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
}

/** Fetch + parse an ESPN scoreboard payload (throws on HTTP error). */
async function fetchScoreboard(url: string): Promise<EspnScoreboard> {
  const res = await fetch(url, { next: { revalidate: APP_CONSTANTS.CACHE.LIVE_REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`ESPN scoreboard HTTP ${res.status}`);
  return (await res.json()) as EspnScoreboard;
}

// ── Closing odds for FINISHED games ────────────────────────────────────────
// The scoreboard mapper now keeps ESPN's line for any game state, so this only
// runs when the scoreboard genuinely omits odds for a completed game. It pulls
// the closing line from the per-event odds endpoint. We cache it only a few
// hours (not 30d): a miss right after a game flips final would otherwise stick,
// so a short revalidate lets an empty lookup self-heal once ESPN publishes it.

interface EspnOddsItem {
  details?: string;
  overUnder?: number;
}
interface EspnOddsResponse {
  items?: EspnOddsItem[];
}

const CLOSING_ODDS_REVALIDATE_SECONDS = 6 * 60 * 60; // 6h — short so a missed lookup self-heals

async function fetchClosingOdds(eventId: string): Promise<MatchupOdds | null> {
  const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${eventId}/competitions/${eventId}/odds`;
  try {
    const res = await fetch(url, { next: { revalidate: CLOSING_ODDS_REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`odds HTTP ${res.status}`);
    const data = (await res.json()) as EspnOddsResponse;
    const o = data.items?.[0];
    if (!o?.details) return null;
    return { spread: o.details, overUnder: o.overUnder ?? null };
  } catch {
    return null; // best-effort — the card just omits the line
  }
}

/** Attach the closing line to completed games missing odds (parallel + cached). */
async function attachClosingOdds(matchups: Matchup[]): Promise<Matchup[]> {
  const needs = matchups.filter((m) => m.state === 'post' && m.espnEventId && !m.odds);
  if (needs.length === 0) return matchups;

  const byId = new Map<string, MatchupOdds | null>();
  await Promise.all(
    needs.map(async (m) => byId.set(m.espnEventId!, await fetchClosingOdds(m.espnEventId!))),
  );

  return matchups.map((m) => {
    const o = m.espnEventId ? byId.get(m.espnEventId) : undefined;
    return o ? { ...m, odds: o } : m;
  });
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
    return attachClosingOdds(mapEspnScoreboard(data, clamped));
  } catch (err) {
    console.error(`❌ [schedule] Week ${clamped} fetch failed:`, err);
    return [];
  }
}

/**
 * Returns the current NFL week's matchups, ordered by kickoff time.
 *
 * Fetches live from ESPN (server-side, cached ~5 min). Falls back to
 * {@link getFallbackMatchups} on any failure so the UI never blanks.
 * Must be called server-side (uses Next fetch caching + avoids CORS).
 */
export async function getCurrentWeekMatchups(): Promise<Matchup[]> {
  try {
    const data = await fetchScoreboard(ESPN_SCOREBOARD_URL);
    const matchups = mapEspnScoreboard(data, CURRENT_WEEK);
    if (matchups.length === 0) throw new Error('ESPN scoreboard returned no usable games');

    return attachClosingOdds(matchups);
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

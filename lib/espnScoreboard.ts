/**
 * ESPN scoreboard mapper — the ONE place that turns an ESPN scoreboard payload
 * into our `Matchup[]`.
 *
 * Deliberately pure + client-safe (no `fetch`, no Node-only imports) so BOTH:
 *   • the server (`lib/schedule.ts`) — for the SSR schedule + week switcher, and
 *   • the client (`lib/hooks/useLiveScores.ts`) — for the 15s live-score poll
 * share exactly one mapping. Do not duplicate this logic anywhere else.
 *
 * The live poll calls ESPN's scoreboard endpoint DIRECTLY from the browser
 * (it is CORS-open), so no server round-trip / Vercel invocation is spent while
 * games are live — see useLiveScores for the polling policy.
 */

import { getTeamByAbbr, type NflTeam } from './teams';
import type { Matchup, GameState, MatchupOdds } from './schedule';

/** Public ESPN scoreboard endpoint (free, CORS-open, no key). */
export const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

// ── Minimal shape of the ESPN scoreboard response (only the fields we read) ──
interface EspnTeamRef {
  abbreviation?: string;
}
interface EspnCompetitor {
  homeAway?: string;
  team?: EspnTeamRef;
  score?: string;
  winner?: boolean;
}
interface EspnStatusType {
  name?: string;
  state?: string;
  completed?: boolean;
  shortDetail?: string;
}
interface EspnOdds {
  details?: string;
  overUnder?: number;
}
interface EspnCompetition {
  competitors?: EspnCompetitor[];
  status?: { type?: EspnStatusType };
  odds?: EspnOdds[];
}
interface EspnEvent {
  date?: string;
  competitions?: EspnCompetition[];
}
export interface EspnScoreboard {
  week?: { number?: number };
  season?: { year?: number };
  events?: EspnEvent[];
}

/**
 * ESPN abbreviation → lib/teams.ts abbreviation, for the cases where ESPN
 * differs from our registry. Everything not listed is used as-is.
 */
const ESPN_ABBR_ALIASES: Readonly<Record<string, string>> = {
  WSH: 'WAS', // Washington Commanders
};

/** Resolve an ESPN team abbreviation to our `NflTeam`, applying aliases. */
function resolveEspnTeam(abbr: string | undefined): NflTeam | null {
  if (!abbr) return null;
  const key = abbr.trim().toUpperCase();
  return getTeamByAbbr(ESPN_ABBR_ALIASES[key] ?? key);
}

/** Parse an ESPN score string ("0", "27") into a number, or `null`. */
function parseScore(raw: string | undefined): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Map an ESPN scoreboard payload into our `Matchup[]`, skipping bad rows and
 * sorting by kickoff. `fallbackWeek` is used only if ESPN omits `week.number`
 * (effectively never for a week-scoped fetch).
 */
export function mapEspnScoreboard(data: EspnScoreboard, fallbackWeek = 1): Matchup[] {
  const week = data.week?.number ?? fallbackWeek;
  const matchups: Matchup[] = [];

  for (const event of data.events ?? []) {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors ?? [];
    const awayComp = competitors.find((c) => c.homeAway === 'away');
    const homeComp = competitors.find((c) => c.homeAway === 'home');

    const away = resolveEspnTeam(awayComp?.team?.abbreviation);
    const home = resolveEspnTeam(homeComp?.team?.abbreviation);

    if (!away || !home) {
      console.warn(
        `⚠️ [schedule] Skipping game — unresolved ESPN abbr(s): away="${awayComp?.team?.abbreviation ?? '?'}", home="${homeComp?.team?.abbreviation ?? '?'}"`,
      );
      continue;
    }

    if (!event.date) {
      console.warn(`⚠️ [schedule] Skipping ${away.abbr}@${home.abbr} — missing kickoff date`);
      continue;
    }

    // Status / lifecycle.
    const statusType = competition?.status?.type;
    const rawState = statusType?.state;
    const state: GameState = rawState === 'post' ? 'post' : rawState === 'in' ? 'in' : 'pre';
    const completed = statusType?.completed ?? statusType?.name === 'STATUS_FINAL';

    // Scores (only meaningful once the game is live/final).
    const awayScore = state === 'pre' ? null : parseScore(awayComp?.score);
    const homeScore = state === 'pre' ? null : parseScore(homeComp?.score);

    // Winner (completed games only) — prefer the explicit flag, else compare.
    let winner: 'away' | 'home' | null = null;
    if (completed) {
      if (awayComp?.winner) winner = 'away';
      else if (homeComp?.winner) winner = 'home';
      else if (awayScore != null && homeScore != null && awayScore !== homeScore) {
        winner = awayScore > homeScore ? 'away' : 'home';
      }
    }

    // Betting line — pre-game only, when ESPN provides it.
    const rawOdds = competition?.odds?.[0];
    const odds: MatchupOdds | null =
      state === 'pre' && rawOdds?.details
        ? { spread: rawOdds.details, overUnder: rawOdds.overUnder ?? null }
        : null;

    const kickoff = new Date(event.date);
    matchups.push({
      id: `${kickoff.getFullYear()}-w${week}-${away.abbr}-${home.abbr}`,
      week,
      away,
      home,
      kickoff,
      state,
      completed,
      statusDetail: statusType?.shortDetail ?? '',
      awayScore,
      homeScore,
      winner,
      odds,
    });
  }

  return matchups.sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
}

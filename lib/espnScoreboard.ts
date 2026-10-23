/**
 * ESPN scoreboard mapper — the ONE place that turns an ESPN scoreboard payload
 * into our `Matchup[]`.
 *
 * Pure (no `fetch`, no Node-only imports). Used server-side by BOTH:
 *   • `lib/schedule.ts` — the SSR schedule + week switcher, and
 *   • `lib/espnLive.ts` — `/api/live/scoreboard`, which the browser's 5s
 *     live-score poll (useLiveScores) calls instead of ESPN.
 * Do not duplicate this logic anywhere else.
 */

import { normalizeTeamAbbr, resolveTeamByAbbr, type NflTeam } from './teams';
import type { Matchup, GameState, GameSituation, MatchupOdds } from './schedule';

/** Public ESPN scoreboard endpoint (free, no key). Server-side only. */
export const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

// ── Minimal shape of the ESPN scoreboard response (only the fields we read) ──
interface EspnTeamRef {
  abbreviation?: string;
  /** ESPN team id (matches `situation.possession`). */
  id?: string;
}
interface EspnRecord {
  name?: string;
  type?: string;
  summary?: string;
}
interface EspnCompetitor {
  homeAway?: string;
  team?: EspnTeamRef;
  score?: string;
  winner?: boolean;
  records?: EspnRecord[];
}
interface EspnStatusType {
  name?: string;
  state?: string;
  completed?: boolean;
  shortDetail?: string;
}
interface EspnOddsQuote {
  odds?: string;
}
interface EspnOddsSide {
  close?: EspnOddsQuote;
  open?: EspnOddsQuote;
}
interface EspnOdds {
  details?: string;
  overUnder?: number;
  moneyline?: { away?: EspnOddsSide; home?: EspnOddsSide };
}
interface EspnBroadcast {
  market?: string;
  names?: string[];
}
interface EspnSituation {
  shortDownDistanceText?: string;
  downDistanceText?: string;
  possessionText?: string;
  /** ESPN team id of the side with the ball. */
  possession?: string;
  isRedZone?: boolean;
}
interface EspnCompetition {
  competitors?: EspnCompetitor[];
  /** Live games only. */
  situation?: EspnSituation;
  status?: { type?: EspnStatusType };
  odds?: EspnOdds[];
  broadcasts?: EspnBroadcast[];
}
interface EspnEvent {
  id?: string;
  date?: string;
  competitions?: EspnCompetition[];
}
export interface EspnScoreboard {
  week?: { number?: number };
  season?: { year?: number };
  events?: EspnEvent[];
}

/** Resolve an ESPN team abbreviation to our `NflTeam`, applying registry aliases. */
function resolveEspnTeam(abbr: string | undefined): NflTeam | null {
  return resolveTeamByAbbr(abbr);
}

/** Parse an ESPN score string ("0", "27") into a number, or `null`. */
function parseScore(raw: string | undefined): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * American odds string → number: "-142" → -142, "+120" → 120, "EVEN" → 100.
 * Anything else (missing, "OFF", "") → null.
 */
export function parseAmericanOdds(raw: string | undefined): number | null {
  if (raw == null) return null;
  const s = raw.trim().toUpperCase();
  if (s === 'EVEN' || s === 'EV') return 100;
  if (!/^[+-]?\d{3,5}$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

/** Live situation (Wave C2) → down & distance, ball spot, possession side; null when ESPN sends none. */
export function mapSituation(s: EspnSituation | undefined, away: EspnCompetitor | undefined, home: EspnCompetitor | undefined): GameSituation | null {
  if (!s) return null;
  const down = s.shortDownDistanceText?.trim() || s.downDistanceText?.split(' at ')[0]?.trim() || null;
  const spot = s.possessionText?.trim() || null;
  const possession = s.possession && s.possession === away?.team?.id ? 'away' : s.possession && s.possession === home?.team?.id ? 'home' : null;
  if (!down && !spot && !possession) return null;
  return { down, spot, possession, redZone: s.isRedZone === true };
}

/** Spread details "KC -2.5" → { team: 'KC', line: -2.5 }; "EVEN" / "PK" / unreadable → null. */
export function parseSpreadDetails(details: string | undefined): { team: string; line: number } | null {
  const m = /^([A-Za-z]{2,4})\s+([+-]?\d+(?:\.\d+)?)$/.exec((details ?? '').trim());
  if (!m) return null;
  const line = Number(m[2]);
  if (!Number.isFinite(line)) return null;
  return { team: normalizeTeamAbbr(m[1].toUpperCase()), line };
}

/** Moneyline per side from `odds[0].moneyline` (closing price, else opening); null when absent. */
function parseMoneyline(raw: EspnOdds['moneyline']): { away: number | null; home: number | null } | null {
  if (!raw) return null;
  const side = (s: EspnOddsSide | undefined) => parseAmericanOdds(s?.close?.odds) ?? parseAmericanOdds(s?.open?.odds);
  const away = side(raw.away);
  const home = side(raw.home);
  return away == null && home == null ? null : { away, home };
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

    // Betting line — keep ESPN's line whenever it's present, regardless of game
    // state. ESPN does NOT reliably keep it once a game is final, so this can be
    // null for finals: the server fills it via attachClosingOdds (lib/schedule),
    // and the client live-poll merge never overwrites a known line with null
    // (ScheduleProvider.patchLiveMatchups).
    const rawOdds = competition?.odds?.[0];
    // `spread` stays ESPN's string (Home renders it as-is); Leans reads the parsed
    // `spreadLine` + `moneyline`. (`odds[0].spread` is not used — its sign flips by side.)
    const odds: MatchupOdds | null =
      rawOdds?.details
        ? {
            spread: rawOdds.details,
            overUnder: rawOdds.overUnder ?? null,
            spreadLine: parseSpreadDetails(rawOdds.details),
            moneyline: parseMoneyline(rawOdds.moneyline),
          }
        : null;

    // Overall W-L(-T) record for each side, straight from the scoreboard payload
    // (no extra fetch). ESPN exposes it as records[{ name: "overall", summary }].
    const recordOf = (c: EspnCompetitor | undefined): string | null =>
      c?.records?.find((r) => r.name === 'overall')?.summary ?? null;

    // Broadcast network (pre-game only; ESPN drops it once a game is final).
    // Shorten the one long name — "Prime Video" → "Prime". Everything else is
    // already short (FOX, CBS, NBC, ABC, ESPN, NFL Network, Netflix).
    const rawNetwork = competition?.broadcasts?.[0]?.names?.[0] ?? null;
    const network = rawNetwork === 'Prime Video' ? 'Prime' : rawNetwork;

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
      awayRecord: recordOf(awayComp),
      homeRecord: recordOf(homeComp),
      network,
      espnEventId: event.id ?? null,
      // Only when there's something to show (keeps the live-parity snapshot byte-identical otherwise).
      ...(() => {
        const situation = state === 'in' ? mapSituation(competition?.situation, awayComp, homeComp) : null;
        return situation ? { situation } : {};
      })(),
    });
  }

  return matchups.sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
}

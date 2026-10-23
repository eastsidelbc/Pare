/**
 * Leans backtest — pure grading + replay (plan docs/plans/2026-10-23-leans-backtest.md).
 *
 * Replays a finished season game by game with only data from earlier weeks (the same
 * cut the screens use), runs the unchanged engine (`gameLeans`, `propLean`) and the
 * formula candidates (lib/formulas), and grades every lean against the final.
 * The fetching lives in scripts/leans-backtest.ts; nothing here does I/O.
 */

import type { FpaTable } from '@/lib/myteam/fpa';
import { FORMULA_CONFIG } from '@/lib/formulas/config';
import { americanToDecimal } from '@/lib/formulas/odds';
import { anytimeTdProb, propOverProb } from '@/lib/formulas/player';
import { mean, shrink, stdev } from '@/lib/formulas/stats';
import { blendForm, projectedMargin, projectedTotal } from '@/lib/formulas/team';
import { LEAN_CONFIG } from './config';
import { ratingFor } from './evaluate';
import { gameLeans, leagueForm, lineFor, type LeagueForm } from './gameLean';
import { effectiveLine, propLean, statValue } from './propLean';
export { mergeOffers, pickMainLine, type PropOffer } from './propLines';
import type { PlayerGame, PropPosition, PropStat, TeamGame } from './types';

export type Outcome = 'win' | 'loss' | 'push';

/** One finished game with its closing lines. */
export interface BacktestGame {
  eventId: string;
  week: number;
  away: string;
  home: string;
  awayScore: number;
  homeScore: number;
  /** Favorite + its line ("KC -3.5"); null = pick'em or no spread. */
  spreadLine: { team: string; line: number } | null;
  hasSpread: boolean;
  total: number | null;
  moneyline: { away: number | null; home: number | null } | null;
}

/** One graded-able prop: a player's main line for one stat in one game. */
export interface BacktestProp {
  eventId: string;
  week: number;
  playerId: string;
  position: PropPosition;
  opp: string;
  stat: PropStat;
  line: number;
  overPrice: number | null;
  underPrice: number | null;
}

// ── Lines + grading ─────────────────────────────────────────────────────

/** Over/under bet on a line: strictly past the line wins, on it pushes. */
export function gradeOverUnder(dir: 'over' | 'under', line: number, actual: number): Outcome {
  if (actual === line) return 'push';
  return (actual > line) === (dir === 'over') ? 'win' : 'loss';
}

/** Spread bet: the side's margin plus its line (−3 = gives 3). */
export function gradeCover(sideMargin: number, sideLine: number): Outcome {
  const v = sideMargin + sideLine;
  return v > 0 ? 'win' : v < 0 ? 'loss' : 'push';
}

/** Moneyline bet: a tie refunds. */
export function gradeMoneyline(sideMargin: number): Outcome {
  return sideMargin > 0 ? 'win' : sideMargin < 0 ? 'loss' : 'push';
}

/** Profit in units for 1 unit staked at a price (standard juice when the book showed none). */
export function profit(outcome: Outcome, american: number | null): number {
  if (outcome === 'push') return 0;
  if (outcome === 'loss') return -1;
  return (americanToDecimal(american ?? FORMULA_CONFIG.standardPrice) ?? 1) - 1;
}

// ── Tallies ─────────────────────────────────────────────────────────────

export interface Tally {
  bets: number;
  wins: number;
  losses: number;
  pushes: number;
  units: number;
}

export type TallyMap = Map<string, Tally>;

export function addResult(map: TallyMap, key: string, outcome: Outcome, american: number | null): void {
  const t = map.get(key) ?? { bets: 0, wins: 0, losses: 0, pushes: 0, units: 0 };
  t.bets += 1;
  if (outcome === 'win') t.wins += 1;
  else if (outcome === 'loss') t.losses += 1;
  else t.pushes += 1;
  t.units += profit(outcome, american);
  map.set(key, t);
}

/** Wins ÷ (wins + losses) — pushes don't count, the way books settle. */
export function hitPct(t: Tally): number | null {
  const decided = t.wins + t.losses;
  return decided === 0 ? null : t.wins / decided;
}

/** Units won per unit staked. */
export function roi(t: Tally): number | null {
  return t.bets === 0 ? null : t.units / t.bets;
}

// ── Engine replay: game lines ───────────────────────────────────────────

export interface GameReplay {
  tallies: TallyMap;
  /** How many games had each verdict, per line ("total:none" …). */
  verdicts: Map<string, number>;
  games: number;
}

const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

/** League form per week, built once (every game in a week shares it). */
function formsByWeek(teamLog: readonly TeamGame[], games: readonly BacktestGame[]): Map<number, LeagueForm> {
  const out = new Map<number, LeagueForm>();
  for (const w of new Set(games.map((g) => g.week))) out.set(w, leagueForm(teamLog, w));
  return out;
}

export function replayGameLeans(teamLog: readonly TeamGame[], games: readonly BacktestGame[]): GameReplay {
  const tallies: TallyMap = new Map();
  const verdicts = new Map<string, number>();
  const forms = formsByWeek(teamLog, games);
  for (const g of games) {
    const league = forms.get(g.week);
    if (!league) continue;
    const gl = gameLeans(
      teamLog,
      {
        awayTeam: g.away,
        homeTeam: g.home,
        week: g.week,
        total: g.total,
        spreadLine: g.spreadLine,
        hasSpread: g.hasSpread,
        hasMoneyline: !!g.moneyline,
      },
      league,
    );
    bump(verdicts, `total:${gl.total.verdict}`);
    bump(verdicts, `spread:${gl.spread.verdict}`);
    bump(verdicts, `moneyline:${gl.moneyline.verdict}`);

    const actualTotal = g.awayScore + g.homeScore;
    const marginOf = (side: 'away' | 'home') => (side === 'away' ? g.awayScore - g.homeScore : g.homeScore - g.awayScore);
    if ((gl.total.verdict === 'over' || gl.total.verdict === 'under') && g.total !== null) {
      const o = gradeOverUnder(gl.total.verdict, g.total, actualTotal);
      addResult(tallies, `total ${gl.total.verdict}`, o, null);
      addResult(tallies, 'total (all)', o, null);
    }
    if (gl.spread.verdict === 'side' && gl.spread.side) {
      const side = gl.spread.side;
      addResult(tallies, 'spread', gradeCover(marginOf(side), lineFor(side, g.away, g.home, g.spreadLine)), null);
    }
    if (gl.moneyline.verdict === 'side' && gl.moneyline.side) {
      const side = gl.moneyline.side;
      addResult(tallies, 'moneyline', gradeMoneyline(marginOf(side)), g.moneyline?.[side] ?? null);
    }
  }
  return { tallies, verdicts, games: games.length };
}

// ── Formula candidates: game lines ──────────────────────────────────────

export interface TeamRating {
  games: number;
  /** Shrunk toward the league per-game average. */
  ppg: number;
  allowed: number;
  /** Points better than average per game: shrunk season PD blended with shrunk last-4 PD. */
  rating: number;
}

/** Every team's shrunk scoring and rating from games before `week`. */
export function teamRatings(teamLog: readonly TeamGame[], week: number): Map<string, TeamRating> {
  const before = teamLog.filter((g) => g.week < week);
  const leaguePpg = mean(before.map((g) => g.points)) ?? 0;
  const out = new Map<string, TeamRating>();
  for (const team of new Set(before.map((g) => g.team))) {
    const games = before.filter((g) => g.team === team).sort((a, b) => a.week - b.week);
    const n = games.length;
    const last = games.slice(-LEAN_CONFIG.lastN);
    const pd = mean(games.map((g) => g.points - g.pointsAllowed)) ?? 0;
    const pdLast = mean(last.map((g) => g.points - g.pointsAllowed)) ?? 0;
    const season = shrink(n, pd, 0) ?? 0;
    const recent = shrink(last.length, pdLast, 0) ?? 0;
    out.set(team, {
      games: n,
      ppg: shrink(n, mean(games.map((g) => g.points)) ?? leaguePpg, leaguePpg) ?? leaguePpg,
      allowed: shrink(n, mean(games.map((g) => g.pointsAllowed)) ?? leaguePpg, leaguePpg) ?? leaguePpg,
      rating: blendForm(season, recent) ?? season,
    });
  }
  return out;
}

/** Pare projected total / margin vs the closing line, leaning when the edge is at least each threshold. */
export function replayGameFormulas(teamLog: readonly TeamGame[], games: readonly BacktestGame[], edges: readonly number[]): TallyMap {
  const tallies: TallyMap = new Map();
  const byWeek = new Map<number, Map<string, TeamRating>>();
  for (const g of games) {
    let ratings = byWeek.get(g.week);
    if (!ratings) {
      ratings = teamRatings(teamLog, g.week);
      byWeek.set(g.week, ratings);
    }
    const a = ratings.get(g.away);
    const h = ratings.get(g.home);
    if (!a || !h || a.games < LEAN_CONFIG.minGames || h.games < LEAN_CONFIG.minGames) continue;
    const actualTotal = g.awayScore + g.homeScore;
    const homeMargin = g.homeScore - g.awayScore;

    const projTotal = projectedTotal(a.ppg, a.allowed, h.ppg, h.allowed);
    if (g.total !== null && projTotal !== null) {
      const e = projTotal - g.total;
      for (const t of edges) {
        if (Math.abs(e) < t) continue;
        addResult(tallies, `formula total, edge ≥ ${t}`, gradeOverUnder(e > 0 ? 'over' : 'under', g.total, actualTotal), null);
      }
    }
    const projHome = projectedMargin(h.rating, a.rating, 'home');
    if (g.hasSpread && projHome !== null) {
      const homeLine = lineFor('home', g.away, g.home, g.spreadLine);
      const e = projHome + homeLine;
      for (const t of edges) {
        if (Math.abs(e) < t) continue;
        const side = e > 0 ? 'home' : 'away';
        const sideLine = side === 'home' ? homeLine : -homeLine;
        addResult(tallies, `formula spread, edge ≥ ${t}`, gradeCover(side === 'home' ? homeMargin : -homeMargin, sideLine), null);
      }
    }
  }
  return tallies;
}

// ── Calibration + market baselines ──────────────────────────────────────

export interface Calibration {
  games: number;
  /** Actual home margin + home line: 0 = the line was exact. */
  marginResidualMean: number | null;
  marginResidualSd: number | null;
  totalResidualMean: number | null;
  totalResidualSd: number | null;
  favoriteCoverPct: number | null;
  homeCoverPct: number | null;
  overPct: number | null;
}

export function calibrate(games: readonly BacktestGame[]): Calibration {
  const margins: number[] = [];
  const totals: number[] = [];
  const fav: TallyMap = new Map();
  const home: TallyMap = new Map();
  const over: TallyMap = new Map();
  for (const g of games) {
    const homeMargin = g.homeScore - g.awayScore;
    if (g.hasSpread) {
      const homeLine = lineFor('home', g.away, g.home, g.spreadLine);
      margins.push(homeMargin + homeLine);
      addResult(home, 'home', gradeCover(homeMargin, homeLine), null);
      if (g.spreadLine) {
        const favSide = g.spreadLine.team === g.home ? 'home' : 'away';
        const favMargin = favSide === 'home' ? homeMargin : -homeMargin;
        addResult(fav, 'fav', gradeCover(favMargin, g.spreadLine.line), null);
      }
    }
    if (g.total !== null) {
      totals.push(g.awayScore + g.homeScore - g.total);
      addResult(over, 'over', gradeOverUnder('over', g.total, g.awayScore + g.homeScore), null);
    }
  }
  const pctOf = (m: TallyMap, k: string) => {
    const t = m.get(k);
    return t ? hitPct(t) : null;
  };
  return {
    games: games.length,
    marginResidualMean: mean(margins),
    marginResidualSd: stdev(margins),
    totalResidualMean: mean(totals),
    totalResidualSd: stdev(totals),
    favoriteCoverPct: pctOf(fav, 'fav'),
    homeCoverPct: pctOf(home, 'home'),
    overPct: pctOf(over, 'over'),
  };
}

// ── Props ───────────────────────────────────────────────────────────────

export interface PlayerSeason {
  playerId: string;
  position: PropPosition;
  /** Every game this season, ascending by week. */
  games: PlayerGame[];
}

export interface PropReplay {
  tallies: TallyMap;
  verdicts: Map<string, number>;
  /** Props whose player had no game that week (inactive) — a book voids these. */
  voided: number;
  graded: number;
}

const priceFor = (p: BacktestProp, dir: 'over' | 'under') => (dir === 'over' ? p.overPrice : p.underPrice);

/** A priced prop can only be bet on a side the book priced (no "no TD" market → no under bet). */
const bettable = (p: BacktestProp, dir: 'over' | 'under') => (p.overPrice === null && p.underPrice === null) || priceFor(p, dir) !== null;

/** The unchanged prop engine on every book line. */
export function replayPropLeans(props: readonly BacktestProp[], players: ReadonlyMap<string, PlayerSeason>, fpa: FpaTable): PropReplay {
  const tallies: TallyMap = new Map();
  const verdicts = new Map<string, number>();
  let voided = 0;
  let graded = 0;
  for (const p of props) {
    const player = players.get(p.playerId);
    const actual = player?.games.find((g) => g.week === p.week);
    if (!player || !actual) {
      voided += 1;
      continue;
    }
    graded += 1;
    const { rating } = ratingFor({ fpa }, p.position, p.opp, p.week, LEAN_CONFIG.prop.tierWindow);
    const lean = propLean({
      games: player.games.filter((g) => g.week < p.week),
      stat: p.stat,
      line: p.line,
      side: 'over',
      position: p.position,
      rating,
    });
    bump(verdicts, `${p.stat}:${lean.verdict}`);
    if (lean.verdict !== 'over' && lean.verdict !== 'under') continue;
    if (!bettable(p, lean.verdict)) {
      bump(verdicts, `${p.stat}:${lean.verdict}-no-market`);
      continue;
    }
    const o = gradeOverUnder(lean.verdict, effectiveLine(p.stat, p.line), statValue(actual, p.stat));
    addResult(tallies, `${p.stat} ${lean.verdict}`, o, priceFor(p, lean.verdict));
    addResult(tallies, 'props (all)', o, priceFor(p, lean.verdict));
  }
  return { tallies, verdicts, voided, graded };
}

/**
 * Formula candidate for props: chance of the over from the player's own games, shrunk toward
 * the book's line (the market's estimate is the prior); anytime TD = Poisson on a shrunk TD rate.
 * Leans over when P ≥ q, under when P ≤ 1 − q.
 */
export function replayPropFormula(
  props: readonly BacktestProp[],
  players: ReadonlyMap<string, PlayerSeason>,
  probs: readonly number[],
): TallyMap {
  const tallies: TallyMap = new Map();
  const pooledSd = new Map<string, number | null>();
  const tdRate = new Map<string, number>();
  const all = [...players.values()];
  for (const p of props) {
    const player = players.get(p.playerId);
    const actual = player?.games.find((g) => g.week === p.week);
    if (!player || !actual) continue;
    const before = player.games.filter((g) => g.week < p.week);
    if (before.length < LEAN_CONFIG.minGames) continue;
    const key = `${p.position}|${p.stat}|${p.week}`;
    let pOver: number | null;
    if (p.stat === 'anytime_td') {
      if (!tdRate.has(key)) {
        const tds = all.filter((s) => s.position === p.position).flatMap((s) => s.games.filter((g) => g.week < p.week).map((g) => statValue(g, 'anytime_td')));
        tdRate.set(key, mean(tds) ?? 0);
      }
      const own = mean(before.map((g) => statValue(g, 'anytime_td'))) ?? 0;
      pOver = anytimeTdProb(shrink(before.length, own, tdRate.get(key) ?? 0) ?? 0);
    } else {
      if (!pooledSd.has(key)) {
        // Spread of this stat among players who carry a line (≥ minGames), before the week.
        const sds = all
          .filter((s) => s.position === p.position)
          .map((s) => s.games.filter((g) => g.week < p.week).map((g) => statValue(g, p.stat)))
          .filter((v) => v.length >= LEAN_CONFIG.minGames)
          .map((v) => stdev(v))
          .filter((v): v is number => v !== null);
        pooledSd.set(key, mean(sds));
      }
      pOver = propOverProb({ line: p.line, values: before.map((g) => statValue(g, p.stat)), priorMean: p.line, priorSd: pooledSd.get(key) ?? 0 });
    }
    if (pOver === null) continue;
    const actualValue = statValue(actual, p.stat);
    const line = effectiveLine(p.stat, p.line);
    for (const q of probs) {
      const dir = pOver >= q ? 'over' : pOver <= 1 - q ? 'under' : null;
      if (!dir || !bettable(p, dir)) continue;
      const o = gradeOverUnder(dir, line, actualValue);
      addResult(tallies, `formula ${p.stat}, P ≥ ${q}`, o, priceFor(p, dir));
      addResult(tallies, `formula props (all), P ≥ ${q}`, o, priceFor(p, dir));
    }
  }
  return tallies;
}

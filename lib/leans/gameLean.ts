/**
 * Game-line leans — pure (Leans DECISIONS §6; plan "Lean engine" table).
 * Three team-data signals per line; a lean needs all three.
 *
 *   TOTAL OVER   both offenses top-10 in points/game, last 4 · each team's last-4
 *                game totals average above the line · over hit in ≥3 of 4 for both
 *   TOTAL UNDER  the mirror (bottom-10 · below · under ≥3 of 4 for both)
 *   SPREAD S     last-4 avg point margin favors S by ≥8 · season point-differential
 *                rank ≥10 places better · S would have covered today's line in ≥3 of
 *                its last 4 AND the other side in ≤1 of 4
 *   MONEYLINE S  signals 1 + 2 as the spread · S won ≥3 of last 4 AND the other ≤1
 *
 * Spread / moneyline are conservative on purpose (expected to be rare). Only games
 * BEFORE the game's week count. Ranks are computed here, client-side, with the
 * shared core (lib/ranking.ts). Thresholds: lib/leans/config.ts.
 */

import { rankAll, type RankPosition } from '@/lib/ranking';
import { LEAN_CONFIG } from './config';
import { avg1, num, rankLabel, signed } from './format';
import type { LeanResult, LeanSignal, TeamGame } from './types';

const N = LEAN_CONFIG.lastN;
const SIGNALS = LEAN_CONFIG.signalCount;

export interface TeamForm {
  team: string;
  /** Games before the week, ascending. */
  games: TeamGame[];
  /** The last N of `games`. */
  last: TeamGame[];
  lastPointsPerGame: number;
  /** Average of points + points allowed over the last N. */
  lastAvgTotal: number;
  /** Average of points − points allowed over the last N. */
  lastAvgMargin: number;
  /** Season (before the week) point differential per game. */
  seasonMarginPerGame: number;
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const margin = (g: TeamGame) => g.points - g.pointsAllowed;
const total = (g: TeamGame) => g.points + g.pointsAllowed;

export function teamForm(log: readonly TeamGame[], team: string, beforeWeek: number): TeamForm {
  const games = log.filter((g) => g.team === team && g.week < beforeWeek).sort((a, b) => a.week - b.week);
  const last = games.slice(-N);
  return {
    team,
    games,
    last,
    lastPointsPerGame: mean(last.map((g) => g.points)),
    lastAvgTotal: mean(last.map(total)),
    lastAvgMargin: mean(last.map(margin)),
    seasonMarginPerGame: mean(games.map(margin)),
  };
}

export interface LeagueForm {
  forms: Map<string, TeamForm>;
  /** Last-N points per game, #1 = most. */
  pointsRank: Map<string, RankPosition>;
  /** Season point differential per game, #1 = best. */
  marginRank: Map<string, RankPosition>;
  /** Teams with at least one game (the rank denominator). */
  ranked: number;
}

/** Every team's form + the two league ranks the signals read. */
export function leagueForm(log: readonly TeamGame[], beforeWeek: number): LeagueForm {
  const teams = [...new Set(log.map((g) => g.team))];
  const forms = new Map(teams.map((t) => [t, teamForm(log, t, beforeWeek)] as const));
  const played = [...forms.values()].filter((f) => f.games.length > 0);
  return {
    forms,
    pointsRank: rankAll(played.map((f) => [f.team, f.lastPointsPerGame] as const), true),
    marginRank: rankAll(played.map((f) => [f.team, f.seasonMarginPerGame] as const), true),
    ranked: played.length,
  };
}

const emptyForm = (team: string): TeamForm => ({
  team, games: [], last: [], lastPointsPerGame: 0, lastAvgTotal: 0, lastAvgMargin: 0, seasonMarginPerGame: 0,
});
const formOf = (league: LeagueForm, team: string) => league.forms.get(team) ?? emptyForm(team);
const rk = (ranks: Map<string, RankPosition>, team: string) => {
  const r = ranks.get(team);
  return r ? rankLabel(r.rank, r.isTied) : '—';
};
const count = (s: readonly LeanSignal[]) => s.filter((x) => x.ok).length;

function notEnough(away: TeamForm, home: TeamForm): boolean {
  return away.games.length < LEAN_CONFIG.minGames || home.games.length < LEAN_CONFIG.minGames;
}
const notEnoughText = (away: TeamForm, home: TeamForm) =>
  `Not enough games yet (${away.team} ${away.games.length} · ${home.team} ${home.games.length}, Pare needs ${LEAN_CONFIG.minGames})`;

// ── Total ────────────────────────────────────────────────────────────────

export interface TotalCell {
  week: number;
  total: number;
  over: boolean;
  under: boolean;
}

export interface TotalLean extends LeanResult {
  /** The direction the three checks were read in. */
  dir: 'over' | 'under';
  cells: { away: TotalCell[]; home: TotalCell[] };
}

export function totalLean(awayTeam: string, homeTeam: string, line: number | null, league: LeagueForm): TotalLean {
  const away = formOf(league, awayTeam);
  const home = formOf(league, homeTeam);
  const cellsOf = (f: TeamForm): TotalCell[] =>
    f.last.map((g) => ({ week: g.week, total: total(g), over: line != null && total(g) > line, under: line != null && total(g) < line }));
  const cells = { away: cellsOf(away), home: cellsOf(home) };

  const ra = league.pointsRank.get(awayTeam);
  const rh = league.pointsRank.get(homeTeam);
  const ranks = `**${awayTeam} ${rk(league.pointsRank, awayTeam)} · ${homeTeam} ${rk(league.pointsRank, homeTeam)}**`;
  const bottomCut = league.ranked - LEAN_CONFIG.total.bottomN;

  const read = (dir: 'over' | 'under'): LeanSignal[] => {
    const top = dir === 'over';
    const rankOk = !!ra && !!rh && (top ? ra.rank <= LEAN_CONFIG.total.topN && rh.rank <= LEAN_CONFIG.total.topN : ra.rank > bottomCut && rh.rank > bottomCut);
    const where = top ? `top-${LEAN_CONFIG.total.topN}` : `bottom-${LEAN_CONFIG.total.bottomN}`;
    if (line == null) {
      return [
        { ok: rankOk, label: `Both offenses ${where} in points, last ${N} (${ranks})` },
        { ok: false, label: 'No total posted yet' },
        { ok: false, label: 'No total posted yet' },
      ];
    }
    const avgOk = top ? away.lastAvgTotal > line && home.lastAvgTotal > line : away.lastAvgTotal < line && home.lastAvgTotal < line;
    const hitsA = cells.away.filter((c) => (top ? c.over : c.under)).length;
    const hitsH = cells.home.filter((c) => (top ? c.over : c.under)).length;
    const hitsOk = hitsA >= LEAN_CONFIG.total.hitsMin && hitsH >= LEAN_CONFIG.total.hitsMin;
    const word = top ? 'Over' : 'Under';
    const hitsLabel =
      hitsA === hitsH && cells.away.length === cells.home.length
        ? `${word} hit in **${hitsA} of ${cells.away.length}** for both teams`
        : `${word} hit in **${hitsA} of ${cells.away.length}** (${awayTeam}) · **${hitsH} of ${cells.home.length}** (${homeTeam})`;
    return [
      { ok: rankOk, label: `Both offenses ${where} in points, last ${N} (${ranks})` },
      { ok: avgOk, label: `Their games average **${avg1(away.lastAvgTotal)}** and **${avg1(home.lastAvgTotal)}** pts, last ${N}` },
      { ok: hitsOk, label: hitsLabel },
    ];
  };

  const over = read('over');
  const under = read('under');
  const dir: 'over' | 'under' = count(under) > count(over) ? 'under' : 'over';
  const shown = dir === 'over' ? over : under;
  const base = { cells, dir };

  if (notEnough(away, home)) {
    return { ...base, verdict: 'not-enough', signals: shown, okCount: count(shown), summary: notEnoughText(away, home), short: 'Not enough games yet' };
  }
  for (const [d, s] of [['over', over], ['under', under]] as const) {
    if (line != null && count(s) === s.length) {
      const where = d === 'over' ? `top-${LEAN_CONFIG.total.topN}` : `bottom-${LEAN_CONFIG.total.bottomN}`;
      return {
        ...base,
        dir: d,
        verdict: d,
        signals: s,
        okCount: s.length,
        summary: `Both offenses ${where} in points, last ${N} (${ranks})`,
        short: `Both offenses ${where} in pts, last ${N}`,
      };
    }
  }
  return {
    ...base,
    verdict: 'none',
    signals: shown,
    okCount: count(shown),
    summary: line == null ? 'No total posted yet' : count(shown) === 0 ? 'Data splits on the total' : `Only **${count(shown)} of ${SIGNALS}** signals point ${dir.toUpperCase()}`,
    short: 'Data splits on the total',
  };
}

// ── Spread + moneyline ───────────────────────────────────────────────────

export interface SideLean extends LeanResult {
  /** The side the three checks were read for. */
  readSide: 'away' | 'home';
}

interface SideCtx {
  away: TeamForm;
  home: TeamForm;
  league: LeagueForm;
}

/** Signals 1 + 2, shared by spread and moneyline. */
function formSignals(s: 'away' | 'home', { away, home, league }: SideCtx): LeanSignal[] {
  const me = s === 'away' ? away : home;
  const them = s === 'away' ? home : away;
  const gapOk = me.lastAvgMargin - them.lastAvgMargin >= LEAN_CONFIG.spread.marginGap;
  const rMe = league.marginRank.get(me.team);
  const rThem = league.marginRank.get(them.team);
  const rankOk = !!rMe && !!rThem && rThem.rank - rMe.rank >= LEAN_CONFIG.spread.rankGap;
  return [
    { ok: gapOk, label: `Point margins, last ${N}: **${away.team} ${signed(away.lastAvgMargin)} · ${home.team} ${signed(home.lastAvgMargin)}**` },
    {
      ok: rankOk,
      label: `Season point differential: **${away.team} ${rk(league.marginRank, away.team)} · ${home.team} ${rk(league.marginRank, home.team)}**`,
    },
  ];
}

const marginsTooClose = ({ away, home }: SideCtx) =>
  `Point margins too close, last ${N} (${away.team} ${signed(away.lastAvgMargin)}, ${home.team} ${signed(home.lastAvgMargin)})`;

function pickSide(
  read: (s: 'away' | 'home') => LeanSignal[],
  ctx: SideCtx,
  preferred: 'away' | 'home',
  noneSummary: (shown: LeanSignal[], side: 'away' | 'home') => string,
  leanText: (side: 'away' | 'home') => { summary: string; short: string },
  noneShort: string,
): SideLean {
  const a = read('away');
  const h = read('home');
  const readSide: 'away' | 'home' = count(a) === count(h) ? preferred : count(a) > count(h) ? 'away' : 'home';
  const shown = readSide === 'away' ? a : h;
  if (notEnough(ctx.away, ctx.home)) {
    return { readSide, verdict: 'not-enough', signals: shown, okCount: count(shown), summary: notEnoughText(ctx.away, ctx.home), short: 'Not enough games yet' };
  }
  for (const [side, s] of [['away', a], ['home', h]] as const) {
    if (count(s) === s.length) return { readSide: side, verdict: 'side', side, signals: s, okCount: s.length, ...leanText(side) };
  }
  return { readSide, verdict: 'none', signals: shown, okCount: count(shown), summary: noneSummary(shown, readSide), short: noneShort };
}

/** The line a side gets today: the favorite's number, the dog's mirror; pick'em = 0. */
export function lineFor(side: 'away' | 'home', awayTeam: string, homeTeam: string, spreadLine: { team: string; line: number } | null): number {
  if (!spreadLine) return 0;
  const team = side === 'away' ? awayTeam : homeTeam;
  return spreadLine.team === team ? spreadLine.line : -spreadLine.line;
}

export function spreadLean(
  awayTeam: string,
  homeTeam: string,
  spreadLine: { team: string; line: number } | null | undefined,
  hasLine: boolean,
  league: LeagueForm,
): SideLean {
  const ctx: SideCtx = { away: formOf(league, awayTeam), home: formOf(league, homeTeam), league };
  const sl = spreadLine ?? null;
  const teamOf = (s: 'away' | 'home') => (s === 'away' ? awayTeam : homeTeam);
  const covers = (f: TeamForm, l: number) => f.last.filter((g) => margin(g) + l > 0).length;

  const read = (s: 'away' | 'home'): LeanSignal[] => {
    const o = s === 'away' ? 'home' : 'away';
    const me = s === 'away' ? ctx.away : ctx.home;
    const them = s === 'away' ? ctx.home : ctx.away;
    const myLine = lineFor(s, awayTeam, homeTeam, sl);
    const theirLine = lineFor(o, awayTeam, homeTeam, sl);
    const mine = covers(me, myLine);
    const theirs = covers(them, theirLine);
    const coverOk = hasLine && mine >= LEAN_CONFIG.spread.coverMin && theirs <= LEAN_CONFIG.spread.otherCoverMax;
    return [
      ...formSignals(s, ctx),
      hasLine
        ? {
            ok: coverOk,
            label: `Would have covered today’s line, last ${N}: **${me.team} ${num(myLine)} ${mine} of ${me.last.length} · ${them.team} ${num(theirLine)} ${theirs} of ${them.last.length}**`,
          }
        : { ok: false, label: 'No spread posted yet' },
    ];
  };
  const favorite: 'away' | 'home' = sl && sl.team === awayTeam ? 'away' : 'home';
  return pickSide(
    read,
    ctx,
    favorite,
    (shown, side) =>
      !hasLine ? 'No spread posted yet' : !shown[0].ok ? marginsTooClose(ctx) : count(shown) === 0 ? 'Data splits on the spread' : `Only **${count(shown)} of ${SIGNALS}** signals point to ${teamOf(side)}`,
    (side) => ({
      summary: `Margins, season and covers all point to **${teamOf(side)}**`,
      short: `Form + margins favor ${teamOf(side)}`,
    }),
    'Data splits on the spread',
  );
}

export function moneylineLean(awayTeam: string, homeTeam: string, hasLine: boolean, league: LeagueForm): SideLean {
  const ctx: SideCtx = { away: formOf(league, awayTeam), home: formOf(league, homeTeam), league };
  const teamOf = (s: 'away' | 'home') => (s === 'away' ? awayTeam : homeTeam);
  const wins = (f: TeamForm) => f.last.filter((g) => g.points > g.pointsAllowed).length;

  const read = (s: 'away' | 'home'): LeanSignal[] => {
    const me = s === 'away' ? ctx.away : ctx.home;
    const them = s === 'away' ? ctx.home : ctx.away;
    const ok = hasLine && wins(me) >= LEAN_CONFIG.moneyline.winMin && wins(them) <= LEAN_CONFIG.moneyline.otherWinMax;
    return [
      ...formSignals(s, ctx),
      hasLine
        ? { ok, label: `Won, last ${N}: **${me.team} ${wins(me)} of ${me.last.length} · ${them.team} ${wins(them)} of ${them.last.length}**` }
        : { ok: false, label: 'No moneyline posted yet' },
    ];
  };
  return pickSide(
    read,
    ctx,
    'home',
    (shown, side) =>
      !hasLine ? 'No moneyline posted yet' : !shown[0].ok ? marginsTooClose(ctx) : count(shown) === 0 ? 'Data splits on the moneyline' : `Only **${count(shown)} of ${SIGNALS}** signals point to ${teamOf(side)}`,
    (side) => ({ summary: `Margins, season and wins all point to **${teamOf(side)}**`, short: `Form + wins favor ${teamOf(side)}` }),
    'Data splits on the moneyline',
  );
}

// ── All three lines for one game ─────────────────────────────────────────

export interface GameLeansInput {
  awayTeam: string;
  homeTeam: string;
  week: number;
  total: number | null;
  spreadLine: { team: string; line: number } | null | undefined;
  hasSpread: boolean;
  hasMoneyline: boolean;
}

export interface GameLeans {
  spread: SideLean;
  total: TotalLean;
  moneyline: SideLean;
  /** The lean the list card's lean row shows (total → spread → moneyline), or null. */
  headline: { line: 'total' | 'spread' | 'moneyline'; result: LeanResult } | null;
  /** Lean row text when there's no headline lean. */
  headlineShort: string;
  notEnough: boolean;
}

export function gameLeans(log: readonly TeamGame[], input: GameLeansInput, league = leagueForm(log, input.week)): GameLeans {
  const total = totalLean(input.awayTeam, input.homeTeam, input.total, league);
  const spread = spreadLean(input.awayTeam, input.homeTeam, input.spreadLine, input.hasSpread, league);
  const ml = moneylineLean(input.awayTeam, input.homeTeam, input.hasMoneyline, league);
  // Mockup copy: when neither side lean exists, the moneyline row says so in one line.
  const moneyline: SideLean =
    ml.verdict === 'none' && spread.verdict === 'none' && input.hasMoneyline ? { ...ml, summary: 'Same story as the spread — no clear side' } : ml;

  const order = [
    ['total', total],
    ['spread', spread],
    ['moneyline', moneyline],
  ] as const;
  const lean = order.find(([, r]) => r.verdict === 'over' || r.verdict === 'under' || r.verdict === 'side');
  const notEnoughAll = order.every(([, r]) => r.verdict === 'not-enough');
  return {
    spread,
    total,
    moneyline,
    headline: lean ? { line: lean[0], result: lean[1] } : null,
    headlineShort: notEnoughAll ? 'Not enough games yet' : 'Data splits on all three lines',
    notEnough: notEnoughAll,
  };
}

/**
 * Prop engine v2 backtest — pure (plan docs/plans/pasted-content-id-fcbb-the-prop-deep-crescent.md,
 * A3–A5; pre-registration docs/plans/2026-10-23-prop-engine-v2/preregistration.md).
 *
 *   buildFeatureRows  every graded prop → its 14 signals as of that week (+ the v1 verdict)
 *   tune              2024 only: per market + side, each signal's θ alone, then K + veto;
 *                     one logistic model per stat (λ by a week-split inside 2024, cutoffs on
 *                     cross-fitted predictions)
 *   grade             the frozen rules on a held-out season: v1 · checklist · logistic ·
 *                     "always this side" on the SAME props
 *   walkForward       weeks ≥ `fromWeek` of the held-out season, refit on everything before
 *
 * Nothing here does I/O; scripts/leans-backtest-v2.ts loads the cached seasons.
 */

import { fitLogistic, predictLogistic } from '@/lib/formulas/logistic';
import { breakevenProb } from '@/lib/formulas/odds';
import { mean, normCdf, stdev } from '@/lib/formulas/stats';
import type { FpaTable } from '@/lib/myteam/fpa';
import type { PlayerGameLine } from '@/lib/myteam/types';
import { addResult, gradeOverUnder, hitPct, roi, type BacktestGame, type BacktestProp, type PlayerSeason, type Tally, type TallyMap } from './backtest';
import { kOfNLeans, logitLeans, logitRow, type FrozenParams, type KofNRule, type LogitModel, type LogitRule, type MarketKey, type SideRule, type UnitKey } from './combine';
import { LEAN_CONFIG } from './config';
import { ratingFor } from './evaluate';
import { propLean, statValue } from './propLean';
import { computeSignals, SIGNAL_IDS, type LineStat, type SignalId, type SignalValue } from './propSignals';
import { buildRoleBook } from './roles';
import { buildPropTables } from './tables';
import type { PropPosition, PropSide, TeamGame } from './types';

export type { FrozenParams, MarketKey, UnitKey };

/** Pre-registered markets (9 × over / under = 18 units). Anytime TD + rush+rec WR: info only. */
export const TESTED_MARKETS: readonly MarketKey[] = ['rec:WR', 'rec:TE', 'rec:RB', 'rec_yd:WR', 'rec_yd:TE', 'rec_yd:RB', 'rush_yd:RB', 'rush_rec_yd:RB', 'rush_yd:QB'];
export const SIDES: readonly PropSide[] = ['over', 'under'];

/** Pre-registered grids (preregistration.md §3). */
export const GRIDS: Readonly<Record<SignalId, readonly number[]>> = {
  l4Hits: [1, 2],
  seasonHit: [0.05, 0.1, 0.15, 0.2],
  medianEdge: [0.05, 0.1, 0.15, 0.2],
  projEdge: [0.05, 0.08, 0.1, 0.15],
  usageTrend: [0.1, 0.2, 0.3],
  snapTrend: [0.05, 0.1],
  impliedTotal: [1.5, 3, 4.5],
  oppAllow: [0.35, 0.5, 0.65],
  oppEff: [0.35, 0.5, 0.65],
  defVsRole: [0.17, 0.33],
  similarDef: [0.17, 0.25],
  passRate: [0.5, 0.65],
  spreadScript: [3, 6],
  fpaTier: [0.35, 0.65],
};
export const K_GRID: readonly number[] = [0.3, 0.4, 0.5, 0.6, 0.7];
export const VETO_GRID: readonly boolean[] = [false, true];
export const L2_GRID: readonly number[] = [0.1, 1, 10];
export const CUT_GRID: readonly number[] = [0.54, 0.56, 0.58, 0.6];
/** Min bets for a tuned choice (2024) and for the ship gate (held-out season, decided bets). */
export const MIN_TUNE_BETS = 75;
export const MIN_GRADE_BETS = 50;
/** Logistic fit settings; λ split = weeks ≤ this vs after, inside the tune season. */
export const LOGIT_FIT = { maxIter: 50, tol: 1e-8 };
export const SPLIT_WEEK = 11;
export const WALK_FROM_WEEK = 6;

export interface FeatureRow {
  season: number;
  week: number;
  market: MarketKey;
  stat: LineStat;
  position: PropPosition;
  playerId: string;
  line: number;
  actual: number;
  overPrice: number | null;
  underPrice: number | null;
  sigs: SignalValue[];
  /** The v1 engine (3 signals, all agree) on the same prop. */
  v1: PropSide | null;
}

export const unitKey = (market: MarketKey, side: PropSide): UnitKey => `${market}:${side}`;
const priceOf = (r: FeatureRow, side: PropSide) => (side === 'over' ? r.overPrice : r.underPrice);
const bettable = (r: FeatureRow, side: PropSide) => (r.overPrice === null && r.underPrice === null) || priceOf(r, side) !== null;

// ── features ────────────────────────────────────────────────────────────

export interface FeatureInput {
  season: number;
  props: readonly BacktestProp[];
  lines: readonly PlayerGameLine[];
  players: ReadonlyMap<string, PlayerSeason>;
  teamLog: readonly TeamGame[];
  games: readonly BacktestGame[];
  fpa: FpaTable;
}

/** Graded props (live lineup cap, played, ≥ minGames before, tested market) → feature rows. */
export function buildFeatureRows(input: FeatureInput): FeatureRow[] {
  const book = buildRoleBook(input.lines);
  const gameOf = new Map(input.games.map((g) => [g.eventId, g] as const));
  const teamAt = new Map(input.lines.map((l) => [`${l.playerId}|${l.week}`, l.team] as const));
  const out: FeatureRow[] = [];
  const weeks = [...new Set(input.props.map((p) => p.week))].sort((a, b) => a - b);
  for (const week of weeks) {
    const tables = buildPropTables(input.lines, week, { book });
    const ratings = new Map<string, ReturnType<typeof ratingFor>['rating']>();
    for (const p of input.props) {
      if (p.week !== week || !p.capped || p.stat === 'anytime_td') continue;
      const market = `${p.stat}:${p.position}` as MarketKey;
      if (!TESTED_MARKETS.includes(market)) continue;
      const player = input.players.get(p.playerId);
      const actualGame = player?.games.find((g) => g.week === week);
      const team = teamAt.get(`${p.playerId}|${week}`);
      if (!player || !actualGame || !team) continue;
      const games = player.games.filter((g) => g.week < week);
      if (games.length < LEAN_CONFIG.minGames) continue;
      const g = gameOf.get(p.eventId);
      const home = g?.home === team;
      const teamLine = g?.openHomeLine == null ? null : home ? g.openHomeLine : -g.openHomeLine;
      const rKey = `${p.position}|${p.opp}`;
      if (!ratings.has(rKey)) ratings.set(rKey, ratingFor({ fpa: input.fpa }, p.position, p.opp, week, LEAN_CONFIG.prop.tierWindow).rating);
      const rating = ratings.get(rKey) ?? null;
      const stat = p.stat;
      const sigs = computeSignals({
        playerId: p.playerId,
        position: p.position,
        team,
        opp: p.opp,
        stat,
        line: p.line,
        games,
        tables,
        teamLog: input.teamLog,
        teamLine,
        total: g?.openTotal ?? null,
        rating,
      });
      const v1 = propLean({ games, stat, line: p.line, side: 'over', position: p.position, rating }).verdict;
      out.push({
        season: input.season,
        week,
        market,
        stat,
        position: p.position,
        playerId: p.playerId,
        line: p.line,
        actual: statValue(actualGame, stat),
        overPrice: p.overPrice,
        underPrice: p.underPrice,
        sigs,
        v1: v1 === 'over' || v1 === 'under' ? v1 : null,
      });
    }
  }
  return out;
}

// ── tallies ─────────────────────────────────────────────────────────────

function bet(t: TallyMap, key: string, r: FeatureRow, side: PropSide): void {
  if (!bettable(r, side)) return;
  addResult(t, key, gradeOverUnder(side, r.line, r.actual), priceOf(r, side));
}

const tallyOf = (rows: readonly FeatureRow[], side: PropSide, pick: (r: FeatureRow) => boolean): Tally => {
  const t: TallyMap = new Map();
  for (const r of rows) if (pick(r)) bet(t, 'x', r, side);
  return t.get('x') ?? { bets: 0, wins: 0, losses: 0, pushes: 0, units: 0 };
};

const decided = (t: Tally) => t.wins + t.losses;

// ── tune: checklist ─────────────────────────────────────────────────────

/** Each signal's θ alone: the grid value with the best ROI (≥ minBets) when betting `side` on its vote. */
export function tuneThetas(rows: readonly FeatureRow[], side: PropSide, minBets = MIN_TUNE_BETS): Partial<Record<SignalId, number>> {
  const theta: Partial<Record<SignalId, number>> = {};
  for (const id of SIGNAL_IDS) {
    let best: { t: number; roi: number } | null = null;
    for (const t of GRIDS[id]) {
      const tal = tallyOf(rows, side, (r) => {
        const x = r.sigs.find((s) => s.id === id)?.x ?? null;
        return x !== null && (side === 'over' ? x >= t : x <= -t);
      });
      const v = roi(tal);
      if (tal.bets >= minBets && v !== null && (!best || v > best.roi)) best = { t, roi: v };
    }
    if (best) theta[id] = best.t;
  }
  return theta;
}

export function tuneKofN(rows: readonly FeatureRow[], side: PropSide, minBets = MIN_TUNE_BETS): KofNRule | null {
  const theta = tuneThetas(rows, side, minBets);
  if (Object.keys(theta).length < LEAN_CONFIG.propV2.minSignals) return null;
  let best: { rule: KofNRule; roi: number } | null = null;
  for (const k of K_GRID) {
    for (const veto of VETO_GRID) {
      const rule: KofNRule = { combiner: 'kofn', theta, k, veto };
      const tal = tallyOf(rows, side, (r) => kOfNLeans(r.sigs, rule, side));
      const v = roi(tal);
      if (tal.bets >= minBets && v !== null && (!best || v > best.roi)) best = { rule, roi: v };
    }
  }
  return best?.rule ?? null;
}

// ── tune: logistic ──────────────────────────────────────────────────────

const STAT_POSITIONS = (stat: LineStat): PropPosition[] =>
  TESTED_MARKETS.filter((m) => m.startsWith(`${stat}:`)).map((m) => m.split(':')[1] as PropPosition);

/** Standardization + positions for a stat's rows (no weights yet). */
function modelFrame(rows: readonly FeatureRow[], stat: LineStat): Pick<LogitModel, 'features' | 'mean' | 'sd' | 'positions'> {
  const features = [...SIGNAL_IDS];
  const col = (id: SignalId) => rows.map((r) => r.sigs.find((s) => s.id === id)?.x).filter((x): x is number => typeof x === 'number');
  return {
    features,
    mean: features.map((id) => mean(col(id)) ?? 0),
    sd: features.map((id) => stdev(col(id)) ?? 0),
    positions: STAT_POSITIONS(stat),
  };
}

const labeled = (rows: readonly FeatureRow[]) => rows.filter((r) => r.actual !== r.line);

export function fitStatModel(rows: readonly FeatureRow[], stat: LineStat, l2: number): LogitModel | null {
  const train = labeled(rows.filter((r) => r.stat === stat));
  if (train.length === 0) return null;
  const frame = modelFrame(train, stat);
  const X = train.map((r) => logitRow(frame, r.sigs, r.position));
  const y = train.map((r) => (r.actual > r.line ? 1 : 0));
  const m = fitLogistic(X, y, { l2, ...LOGIT_FIT });
  return m ? { ...frame, weights: m.weights, intercept: m.intercept } : null;
}

export const pOverOf = (m: LogitModel, r: FeatureRow) => predictLogistic({ weights: [...m.weights], intercept: m.intercept }, logitRow(m, r.sigs, r.position));

function logLoss(m: LogitModel, rows: readonly FeatureRow[]): number {
  const eps = Number.EPSILON;
  const ls = labeled(rows).map((r) => {
    const p = Math.min(1 - eps, Math.max(eps, pOverOf(m, r)));
    return r.actual > r.line ? -Math.log(p) : -Math.log(1 - p);
  });
  return mean(ls) ?? Infinity;
}

export interface StatModelTune {
  l2: number;
  model: LogitModel;
  /** Cross-fitted P(over) for every training row (fit on the other half of the season). */
  crossFit: Map<FeatureRow, number>;
}

/** λ by a two-way week split of the tune season (log-loss), then refit on all of it. */
export function tuneStatModel(rows: readonly FeatureRow[], stat: LineStat): StatModelTune | null {
  const mine = rows.filter((r) => r.stat === stat);
  const early = mine.filter((r) => r.week <= SPLIT_WEEK);
  const late = mine.filter((r) => r.week > SPLIT_WEEK);
  let best: { l2: number; loss: number; crossFit: Map<FeatureRow, number> } | null = null;
  for (const l2 of L2_GRID) {
    const a = fitStatModel(early, stat, l2);
    const b = fitStatModel(late, stat, l2);
    if (!a || !b) continue;
    const loss = (logLoss(a, late) * late.length + logLoss(b, early) * early.length) / Math.max(1, mine.length);
    if (!best || loss < best.loss) {
      const crossFit = new Map<FeatureRow, number>();
      for (const r of late) crossFit.set(r, pOverOf(a, r));
      for (const r of early) crossFit.set(r, pOverOf(b, r));
      best = { l2, loss, crossFit };
    }
  }
  if (!best) return null;
  const model = fitStatModel(mine, stat, best.l2);
  return model ? { l2: best.l2, model, crossFit: best.crossFit } : null;
}

/** Cutoff for one unit on the cross-fitted predictions (best ROI with ≥ minBets). */
export function tuneCut(rows: readonly FeatureRow[], pOver: ReadonlyMap<FeatureRow, number>, side: PropSide, minBets = MIN_TUNE_BETS): LogitRule | null {
  let best: { rule: LogitRule; roi: number } | null = null;
  for (const cut of CUT_GRID) {
    const rule: LogitRule = { combiner: 'logit', cut };
    const tal = tallyOf(rows, side, (r) => {
      const p = pOver.get(r);
      return p !== undefined && logitLeans(p, rule, side);
    });
    const v = roi(tal);
    if (tal.bets >= minBets && v !== null && (!best || v > best.roi)) best = { rule, roi: v };
  }
  return best?.rule ?? null;
}

// ── the frozen parameters ───────────────────────────────────────────────

export function tuneAll(train: readonly FeatureRow[]): FrozenParams {
  const out: FrozenParams = { kofn: {}, logit: {}, models: {} };
  const stats = [...new Set(TESTED_MARKETS.map((m) => m.split(':')[0] as LineStat))];
  const crossFit = new Map<FeatureRow, number>();
  for (const stat of stats) {
    const t = tuneStatModel(train, stat);
    if (!t) continue;
    out.models[stat] = { ...t.model, l2: t.l2 };
    for (const [r, p] of t.crossFit) crossFit.set(r, p);
  }
  for (const market of TESTED_MARKETS) {
    const rows = train.filter((r) => r.market === market);
    for (const side of SIDES) {
      const u = unitKey(market, side);
      const k = tuneKofN(rows, side);
      if (k) out.kofn[u] = k;
      const c = tuneCut(rows, crossFit, side);
      if (c) out.logit[u] = c;
    }
  }
  return out;
}

// ── grading ─────────────────────────────────────────────────────────────

export type Method = 'v1' | 'kofn' | 'logit' | 'blanket';

/** Does `method` bet `side` on this row under the frozen params? */
export function picks(params: FrozenParams, method: Method, r: FeatureRow, side: PropSide): boolean {
  const u = unitKey(r.market, side);
  switch (method) {
    case 'blanket':
      return true;
    case 'v1':
      return r.v1 === side;
    case 'kofn': {
      const rule = params.kofn[u];
      return !!rule && kOfNLeans(r.sigs, rule, side);
    }
    case 'logit': {
      const rule = params.logit[u];
      const m = params.models[r.stat];
      return !!rule && !!m && logitLeans(pOverOf(m, r), rule, side);
    }
  }
}

export const METHODS: readonly Method[] = ['v1', 'kofn', 'logit', 'blanket'];

/** Per unit + method on the held-out rows. A row the method leans both ways on is skipped. */
export function gradeAll(params: FrozenParams, rows: readonly FeatureRow[]): Map<string, Tally> {
  const t: TallyMap = new Map();
  for (const r of rows) {
    for (const method of METHODS) {
      const over = picks(params, method, r, 'over');
      const under = picks(params, method, r, 'under');
      for (const side of SIDES) {
        if (method === 'blanket') bet(t, `${unitKey(r.market, side)}|${method}`, r, side);
        else if (side === 'over' ? over && !under : under && !over) bet(t, `${unitKey(r.market, side)}|${method}`, r, side);
      }
    }
  }
  return t;
}

/** Week by week from `fromWeek`: refit on the tune season + earlier test weeks, grade that week. */
export function walkForward(train: readonly FeatureRow[], test: readonly FeatureRow[], fromWeek = WALK_FROM_WEEK): Map<string, Tally> {
  const t: TallyMap = new Map();
  const weeks = [...new Set(test.map((r) => r.week))].filter((w) => w >= fromWeek).sort((a, b) => a - b);
  for (const w of weeks) {
    const params = tuneAll([...train, ...test.filter((r) => r.week < w)]);
    for (const [k, v] of gradeAll(params, test.filter((r) => r.week === w))) {
      const acc = t.get(k) ?? { bets: 0, wins: 0, losses: 0, pushes: 0, units: 0 };
      t.set(k, { bets: acc.bets + v.bets, wins: acc.wins + v.wins, losses: acc.losses + v.losses, pushes: acc.pushes + v.pushes, units: acc.units + v.units });
    }
  }
  return t;
}

// ── the ship gate ───────────────────────────────────────────────────────

/** Average break-even win rate of the bets a method made (priced per bet; −110 when unpriced). */
export function avgBreakeven(params: FrozenParams, method: Method, rows: readonly FeatureRow[], side: PropSide, market: MarketKey): number | null {
  const ps = rows
    .filter((r) => r.market === market && bettable(r, side) && r.actual !== r.line && picks(params, method, r, side) && !(method !== 'blanket' && picks(params, method, r, side === 'over' ? 'under' : 'over')))
    .map((r) => breakevenProb(priceOf(r, side) ?? undefined))
    .filter((p): p is number => p !== null);
  return mean(ps);
}

/** One-sided P(this many wins or more | true hit rate = p0), normal approximation. */
export function pValue(t: Tally, p0: number): number | null {
  const n = decided(t);
  if (n === 0) return null;
  const z = (t.wins - n * p0) / Math.sqrt(n * p0 * (1 - p0));
  const c = normCdf(z);
  return c === null ? null : 1 - c;
}

/**
 * Chance a rule with NO edge (true return = −vig) still shows ROI > 0 over `bets` bets —
 * the "passes by luck" rate. ROI per bet has SD ≈ 1 at even-ish prices.
 */
export function luckPassRate(bets: number, vig: number): number | null {
  if (bets <= 0) return null;
  const c = normCdf(vig * Math.sqrt(bets));
  return c === null ? null : 1 - c;
}

export interface GateResult {
  unit: UnitKey;
  method: Method;
  tally: Tally;
  hit: number | null;
  roi: number | null;
  breakeven: number | null;
  walk: Tally | null;
  walkRoi: number | null;
  p: number | null;
  beatsBlanket: boolean;
  /** pass = ships · watch = passes everything but the walk-forward · fail. */
  verdict: 'pass' | 'watch' | 'fail';
}

export function gate(params: FrozenParams, test: readonly FeatureRow[], graded: Map<string, Tally>, walk: Map<string, Tally>): GateResult[] {
  const out: GateResult[] = [];
  for (const market of TESTED_MARKETS) {
    for (const side of SIDES) {
      const unit = unitKey(market, side);
      const blanket = graded.get(`${unit}|blanket`);
      const blanketRoi = blanket ? roi(blanket) : null;
      for (const method of ['kofn', 'logit'] as const) {
        const tally = graded.get(`${unit}|${method}`) ?? { bets: 0, wins: 0, losses: 0, pushes: 0, units: 0 };
        const w = walk.get(`${unit}|${method}`) ?? null;
        const r = roi(tally);
        const be = avgBreakeven(params, method, test, side, market);
        const h = hitPct(tally);
        const passes = decided(tally) >= MIN_GRADE_BETS && r !== null && r > 0 && h !== null && be !== null && h > be;
        const walkRoi = w ? roi(w) : null;
        out.push({
          unit,
          method,
          tally,
          hit: h,
          roi: r,
          breakeven: be,
          walk: w,
          walkRoi,
          p: be === null ? null : pValue(tally, be),
          beatsBlanket: r !== null && blanketRoi !== null && r > blanketRoi,
          verdict: passes ? (walkRoi !== null && walkRoi >= 0 ? 'pass' : 'watch') : 'fail',
        });
      }
    }
  }
  return out;
}

/** The unit's shipped rule: the passing method (both pass → higher ROI; tie → the checklist). */
export function pickWinner(results: readonly GateResult[], params: FrozenParams, unit: UnitKey): { rule: SideRule; result: GateResult | null } {
  const passing = results.filter((g) => g.unit === unit && g.verdict === 'pass').sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0) || (a.method === 'kofn' ? -1 : 1));
  const top = passing[0];
  if (!top) return { rule: { combiner: 'off' }, result: null };
  const rule = top.method === 'kofn' ? params.kofn[unit] : params.logit[unit];
  return { rule: rule ?? { combiner: 'off' }, result: top };
}



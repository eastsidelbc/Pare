/**
 * Prop research v3 — exhaustive rule search with a shuffle null (pure; pre-registration
 * docs/plans/2026-10-23-prop-search-v3/preregistration.md).
 *
 * A rule = a market + side (e.g. "rec:WR:under") and 1–3 conditions "feature ≥ t" / "feature ≤ t",
 * thresholds = the feature's deciles on the search rows of that market. Every single condition,
 * every pair, and the best pairs extended to triples are scored — tens of millions of rules. Bitsets
 * (one bit per prop) keep each check to a few hundred word operations.
 *
 * Score = Wilson 95% lower bound of the hit rate − the market + side's average break-even
 * (its real prices), with ≥ MIN_BETS bets, ≥ MIN_SEASON in each search season, and above
 * break-even in BOTH seasons. Because this many tries always finds lucky rules, the bar is set by
 * the SAME search on shuffled results (wins reshuffled among that market's props, per season —
 * the "always under" lean stays in, skill is removed): a rule must beat the 95th percentile of
 * the best score the shuffled runs found.
 */

import { breakevenProb } from '@/lib/formulas/odds';
import type { FeatureRow, MarketKey } from '../backtestV2';
import type { PropSide } from '../types';

export const SEARCH = {
  quantiles: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9] as readonly number[],
  minBets: 150,
  minSeason: 60,
  /** Pairs kept to extend into triples, per unit. */
  beam: 300,
  /** Best rules kept per unit (for the report + finalists). */
  keep: 40,
  z: 1.96,
} as const;

export type Op = '>=' | '<=';
export interface Condition {
  feature: string;
  op: Op;
  threshold: number;
}
export interface Rule {
  market: MarketKey;
  side: PropSide;
  conds: Condition[];
}
export interface Scored extends Rule {
  n: number;
  w: number;
  n1: number;
  w1: number;
  n2: number;
  w2: number;
  breakeven: number;
  score: number;
}

// ── bitsets ─────────────────────────────────────────────────────────────

const pop32 = (x: number) => {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};

function popcount(a: Uint32Array): number {
  let c = 0;
  for (let i = 0; i < a.length; i++) c += pop32(a[i]);
  return c;
}

function popAnd(a: Uint32Array, b: Uint32Array): number {
  let c = 0;
  for (let i = 0; i < a.length; i++) c += pop32(a[i] & b[i]);
  return c;
}

function andInto(out: Uint32Array, a: Uint32Array, b: Uint32Array): void {
  for (let i = 0; i < a.length; i++) out[i] = a[i] & b[i];
}

const newBits = (n: number) => new Uint32Array(Math.ceil(n / 32));
const setBit = (b: Uint32Array, i: number) => {
  b[i >>> 5] |= 1 << (i & 31);
};

// ── one unit (market + side) ────────────────────────────────────────────

export interface UnitData {
  market: MarketKey;
  side: PropSide;
  rows: FeatureRow[];
  wins: Uint32Array;
  season1: Uint32Array;
  breakeven: number;
  conds: Array<{ cond: Condition; bits: Uint32Array; support: number }>;
}

const sideWins = (r: FeatureRow, side: PropSide) => (side === 'over' ? r.actual > r.line : r.actual < r.line);
const priceOf = (r: FeatureRow, side: PropSide) => (side === 'over' ? r.overPrice : r.underPrice);
const bettable = (r: FeatureRow, side: PropSide) => (r.overPrice === null && r.underPrice === null) || priceOf(r, side) !== null;

function quantile(sorted: readonly number[], q: number): number {
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Build a unit's bitsets. `seasonA` = the first search season (the other is the second). */
export function buildUnit(all: readonly FeatureRow[], market: MarketKey, side: PropSide, seasonA: number, features: readonly string[]): UnitData {
  const rows = all.filter((r) => r.market === market && r.actual !== r.line && bettable(r, side) && r.f);
  const n = rows.length;
  const wins = newBits(n);
  const season1 = newBits(n);
  rows.forEach((r, i) => {
    if (sideWins(r, side)) setBit(wins, i);
    if (r.season === seasonA) setBit(season1, i);
  });
  const bes = rows.map((r) => breakevenProb(priceOf(r, side) ?? undefined) ?? 0);
  const breakeven = bes.reduce((s, x) => s + x, 0) / Math.max(1, n);
  const conds: UnitData['conds'] = [];
  for (const feature of features) {
    const vals = rows.map((r) => r.f?.[feature] ?? null);
    const present = vals.filter((x): x is number => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
    if (present.length < SEARCH.minBets) continue;
    const seen = new Set<string>();
    for (const q of SEARCH.quantiles) {
      const t = Number(quantile(present, q).toPrecision(6));
      for (const op of ['>=', '<='] as const) {
        const key = `${op}${t}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const bits = newBits(n);
        let support = 0;
        vals.forEach((x, i) => {
          if (x !== null && Number.isFinite(x) && (op === '>=' ? x >= t : x <= t)) {
            setBit(bits, i);
            support++;
          }
        });
        if (support >= SEARCH.minBets && support < n) conds.push({ cond: { feature, op, threshold: t }, bits, support });
      }
    }
  }
  return { market, side, rows, wins, season1, breakeven, conds };
}

/** Wilson score interval lower bound. */
export function wilsonLow(w: number, n: number, z: number = SEARCH.z): number {
  if (n === 0) return 0;
  const p = w / n;
  const d = 1 + (z * z) / n;
  return (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
}

interface Counts {
  n: number;
  w: number;
  n1: number;
  w1: number;
}

function countsOf(mask: Uint32Array, wins: Uint32Array, season1: Uint32Array, winS1: Uint32Array): Counts | null {
  const n = popcount(mask);
  if (n < SEARCH.minBets) return null;
  const n1 = popAnd(mask, season1);
  if (n1 < SEARCH.minSeason || n - n1 < SEARCH.minSeason) return null;
  return { n, n1, w: popAnd(mask, wins), w1: popAnd(mask, winS1) };
}

function scoreOf(c: Counts, be: number): number | null {
  const n2 = c.n - c.n1;
  const w2 = c.w - c.w1;
  if (c.w1 / c.n1 <= be || w2 / n2 <= be) return null;
  return wilsonLow(c.w, c.n) - be;
}

export interface UnitResult {
  best: Scored[];
  /** Highest score found (−∞ when nothing qualified). */
  max: number;
  evaluated: number;
}

/** Singles + pairs + beam triples on one unit. `wins` may be a shuffled copy (null runs). */
export function searchUnit(u: UnitData, wins: Uint32Array = u.wins): UnitResult {
  const winS1 = newBits(u.rows.length);
  andInto(winS1, wins, u.season1);
  // Kept lists are pruned in batches (sorting on every insert would dominate the run).
  let top: Scored[] = [];
  let topCut = -Infinity;
  let max = -Infinity;
  let evaluated = 0;
  const consider = (idx: number[], c: Counts, score: number) => {
    if (score > max) max = score;
    if (score <= topCut) return;
    top.push({
      market: u.market,
      side: u.side,
      conds: idx.map((i) => u.conds[i].cond),
      n: c.n,
      w: c.w,
      n1: c.n1,
      w1: c.w1,
      n2: c.n - c.n1,
      w2: c.w - c.w1,
      breakeven: u.breakeven,
      score,
    });
    if (top.length > SEARCH.keep * 4) {
      top.sort((a, b) => b.score - a.score);
      top = top.slice(0, SEARCH.keep);
      topCut = top[top.length - 1].score;
    }
  };

  const K = u.conds.length;
  for (let i = 0; i < K; i++) {
    evaluated++;
    const c = countsOf(u.conds[i].bits, wins, u.season1, winS1);
    const s = c && scoreOf(c, u.breakeven);
    if (c && s !== null && s !== undefined) consider([i], c, s);
  }

  const scratch = newBits(u.rows.length);
  let pairs: Array<{ i: number; j: number; score: number }> = [];
  let pairCut = -Infinity;
  for (let i = 0; i < K; i++) {
    if (u.conds[i].support < SEARCH.minBets) continue;
    for (let j = i + 1; j < K; j++) {
      if (u.conds[i].cond.feature === u.conds[j].cond.feature) continue;
      evaluated++;
      andInto(scratch, u.conds[i].bits, u.conds[j].bits);
      const c = countsOf(scratch, wins, u.season1, winS1);
      if (!c) continue;
      const s = scoreOf(c, u.breakeven);
      if (s === null) continue;
      consider([i, j], c, s);
      if (s > pairCut) {
        pairs.push({ i, j, score: s });
        if (pairs.length > SEARCH.beam * 4) {
          pairs.sort((a, b) => b.score - a.score);
          pairs = pairs.slice(0, SEARCH.beam);
          pairCut = pairs[pairs.length - 1].score;
        }
      }
    }
  }

  pairs.sort((a, b) => b.score - a.score);
  pairs = pairs.slice(0, SEARCH.beam);
  const pairMask = newBits(u.rows.length);
  for (const p of pairs) {
    andInto(pairMask, u.conds[p.i].bits, u.conds[p.j].bits);
    const used = new Set([u.conds[p.i].cond.feature, u.conds[p.j].cond.feature]);
    for (let k = 0; k < K; k++) {
      if (used.has(u.conds[k].cond.feature)) continue;
      evaluated++;
      andInto(scratch, pairMask, u.conds[k].bits);
      const c = countsOf(scratch, wins, u.season1, winS1);
      if (!c) continue;
      const s = scoreOf(c, u.breakeven);
      if (s !== null) consider([p.i, p.j, k], c, s);
    }
  }
  top.sort((a, b) => b.score - a.score);
  return { best: top.slice(0, SEARCH.keep), max, evaluated };
}

// ── shuffle null ────────────────────────────────────────────────────────

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wins reshuffled among the unit's props, separately inside each season (counts kept). */
export function shuffledWins(u: UnitData, rand: () => number): Uint32Array {
  const out = newBits(u.rows.length);
  for (const inS1 of [true, false]) {
    const idx: number[] = [];
    let wins = 0;
    u.rows.forEach((_, i) => {
      const s1 = (u.season1[i >>> 5] >>> (i & 31)) & 1;
      if ((s1 === 1) === inS1) {
        idx.push(i);
        if ((u.wins[i >>> 5] >>> (i & 31)) & 1) wins++;
      }
    });
    for (let k = idx.length - 1; k > 0; k--) {
      const r = Math.floor(rand() * (k + 1));
      [idx[k], idx[r]] = [idx[r], idx[k]];
    }
    for (let k = 0; k < wins; k++) setBit(out, idx[k]);
  }
  return out;
}

// ── applying a frozen rule ──────────────────────────────────────────────

export function ruleFires(rule: Pick<Rule, 'market' | 'conds'>, r: FeatureRow): boolean {
  if (r.market !== rule.market || !r.f) return false;
  return rule.conds.every((c) => {
    const x = r.f?.[c.feature];
    return x !== null && x !== undefined && Number.isFinite(x) && (c.op === '>=' ? x >= c.threshold : x <= c.threshold);
  });
}

/** Overlap of two rules' bets (Jaccard) on the same rows. */
export function overlap(a: Rule, b: Rule, rows: readonly FeatureRow[]): number {
  if (a.market !== b.market || a.side !== b.side) return 0;
  let both = 0;
  let either = 0;
  for (const r of rows) {
    const x = ruleFires(a, r);
    const y = ruleFires(b, r);
    if (x && y) both++;
    if (x || y) either++;
  }
  return either === 0 ? 0 : both / either;
}

export const ruleText = (r: Pick<Rule, 'market' | 'side' | 'conds'>) =>
  `${r.market}:${r.side} — ${r.conds.map((c) => `${c.feature} ${c.op} ${c.threshold}`).join(' AND ')}`;

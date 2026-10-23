/**
 * Combining prop signals into a lean — pure (prop engine v2, A4). Two rules, both frozen
 * from the 2024 tune and graded once on 2025 (the winner per market + side ships):
 *
 *   kofn   checklist: each signal votes over (x ≥ θ) / under (x ≤ −θ) / neither; a side
 *          leans when at least ⌈k × N⌉ of the N signals with data vote for it — and with
 *          `veto`, none vote against.
 *   logit  logistic score: standardized signals (missing = the training mean) + a
 *          position offset → P(over); a side leans when P clears its cutoff.
 */

import { predictLogistic } from '@/lib/formulas/logistic';
import { LEAN_CONFIG } from './config';
import type { LineStat, SignalId, SignalValue } from './propSignals';
import type { PropPosition, PropSide } from './types';

export interface KofNRule {
  combiner: 'kofn';
  /** Vote threshold per signal (a signal without one doesn't vote). */
  theta: Partial<Record<SignalId, number>>;
  /** Share of the signals with data that must vote this side. */
  k: number;
  veto: boolean;
}

export interface LogitRule {
  combiner: 'logit';
  /** P(over) ≥ cut → over; P(over) ≤ 1 − cut → under (the side this rule is for). */
  cut: number;
}

export type SideRule = KofNRule | LogitRule | { combiner: 'off' };

/** One logistic model per stat (positions pooled, one offset each). */
export interface LogitModel {
  features: readonly SignalId[];
  mean: readonly number[];
  sd: readonly number[];
  /** Positions with their own offset (the first position of the stat is the baseline). */
  positions: readonly PropPosition[];
  weights: readonly number[];
  intercept: number;
}

export type MarketKey = `${LineStat}:${PropPosition}`;
export type UnitKey = `${MarketKey}:${PropSide}`;

/** Everything the 2024 tune froze: a checklist + a logistic cutoff per unit, one model per stat. */
export interface FrozenParams {
  kofn: Partial<Record<UnitKey, KofNRule>>;
  logit: Partial<Record<UnitKey, LogitRule>>;
  models: Partial<Record<LineStat, LogitModel & { l2: number }>>;
}

/** A shipped unit: its rule's method + its held-out record (shown on the prop screen). */
export interface ShippedUnit {
  method: 'kofn' | 'logit';
  season: number;
  wins: number;
  losses: number;
  roi: number;
  /** Did it beat "always this side" on the same props (Kobe's label, 2026-10-23)? */
  beatsBlanket: boolean;
}
export type ShipTable = Partial<Record<UnitKey, ShippedUnit>>;

export interface KofNResult {
  over: number;
  under: number;
  /** Signals with data that have a threshold. */
  of: number;
}

export function countVotes(sigs: readonly SignalValue[], theta: Partial<Record<SignalId, number>>): KofNResult {
  let over = 0;
  let under = 0;
  let of = 0;
  for (const s of sigs) {
    const t = theta[s.id];
    if (t === undefined || s.x === null) continue;
    of += 1;
    if (s.x >= t) over += 1;
    else if (s.x <= -t) under += 1;
  }
  return { over, under, of };
}

/** Does the checklist rule lean `side`? */
export function kOfNLeans(sigs: readonly SignalValue[], rule: KofNRule, side: PropSide): boolean {
  const v = countVotes(sigs, rule.theta);
  if (v.of < LEAN_CONFIG.propV2.minSignals) return false;
  const mine = side === 'over' ? v.over : v.under;
  const theirs = side === 'over' ? v.under : v.over;
  return mine >= Math.ceil(rule.k * v.of) && (rule.veto ? theirs === 0 : mine > theirs);
}

/** The model's input row: standardized signals (missing → 0 = the mean), then position offsets. */
export function logitRow(model: Pick<LogitModel, 'features' | 'mean' | 'sd' | 'positions'>, sigs: readonly SignalValue[], position: PropPosition): number[] {
  const byId = new Map(sigs.map((s) => [s.id, s.x] as const));
  const row = model.features.map((id, j) => {
    const x = byId.get(id);
    const sd = model.sd[j];
    return x === null || x === undefined || !sd ? 0 : (x - model.mean[j]) / sd;
  });
  for (const p of model.positions.slice(1)) row.push(p === position ? 1 : 0);
  return row;
}

export function logitPOver(model: LogitModel, sigs: readonly SignalValue[], position: PropPosition): number {
  return predictLogistic({ weights: [...model.weights], intercept: model.intercept }, logitRow(model, sigs, position));
}

export function logitLeans(pOver: number, rule: LogitRule, side: PropSide): boolean {
  return side === 'over' ? pOver >= rule.cut : pOver <= 1 - rule.cut;
}

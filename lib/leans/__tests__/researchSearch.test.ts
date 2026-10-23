/** Prop research v3 search: finds a planted rule, the shuffle keeps win counts, Wilson bound, rule matching. */
import { describe, expect, it } from 'vitest';
import type { FeatureRow } from '../backtestV2';
import { buildUnit, rng, ruleFires, searchUnit, shuffledWins, wilsonLow } from '../research/search';

/** 1,000 rec:WR props over two seasons; the under wins 80% when `edge` ≥ 0.7, 45% otherwise. */
function rows(seed = 7): FeatureRow[] {
  const rand = rng(seed);
  return Array.from({ length: 1000 }, (_, i) => {
    const edge = rand();
    const noise = rand();
    const under = rand() < (edge >= 0.7 ? 0.8 : 0.45);
    return {
      season: i % 2 === 0 ? 2024 : 2025,
      week: 5 + (i % 10),
      market: 'rec:WR',
      stat: 'rec',
      position: 'WR',
      playerId: `p${i}`,
      line: 4.5,
      actual: under ? 3 : 6,
      overPrice: -110,
      underPrice: -110,
      sigs: [],
      v1: null,
      f: { edge, noise },
    } satisfies FeatureRow;
  });
}

describe('research search', () => {
  it('Wilson lower bound: 50 of 100 → 0.404; 0 bets → 0', () => {
    expect(wilsonLow(50, 100)).toBeCloseTo(0.4038, 3);
    expect(wilsonLow(0, 0)).toBe(0);
  });
  it('finds the planted rule (edge ≥ 0.7 → under) and ignores the noise feature', () => {
    const u = buildUnit(rows(), 'rec:WR', 'under', 2024, ['edge', 'noise']);
    const r = searchUnit(u);
    expect(r.best.length).toBeGreaterThan(0);
    const top = r.best[0];
    expect(top.conds.some((c) => c.feature === 'edge' && c.op === '>=')).toBe(true);
    expect(top.w / top.n).toBeGreaterThan(0.7);
    expect(r.evaluated).toBeGreaterThan(u.conds.length);
  });
  it('shuffled wins keep the count in each season and are reproducible', () => {
    const u = buildUnit(rows(), 'rec:WR', 'under', 2024, ['edge', 'noise']);
    const count = (b: Uint32Array, s1: boolean) => u.rows.filter((_, i) => ((u.season1[i >>> 5] >>> (i & 31)) & 1) === (s1 ? 1 : 0) && ((b[i >>> 5] >>> (i & 31)) & 1) === 1).length;
    const a = shuffledWins(u, rng(1));
    expect(count(a, true)).toBe(count(u.wins, true));
    expect(count(a, false)).toBe(count(u.wins, false));
    expect(shuffledWins(u, rng(1))).toEqual(a);
  });
  it('on shuffled results the planted edge is gone (best score drops)', () => {
    const u = buildUnit(rows(), 'rec:WR', 'under', 2024, ['edge', 'noise']);
    const real = searchUnit(u).max;
    const nul = searchUnit(u, shuffledWins(u, rng(3))).max;
    expect(nul).toBeLessThan(real);
  });
  it('ruleFires: market + every condition', () => {
    const r = rows()[0];
    const rule = { market: 'rec:WR' as const, conds: [{ feature: 'edge', op: '>=' as const, threshold: -1 }] };
    expect(ruleFires(rule, r)).toBe(true);
    expect(ruleFires({ ...rule, market: 'rec:TE' }, r)).toBe(false);
    expect(ruleFires({ ...rule, conds: [{ feature: 'missing', op: '>=', threshold: 0 }] }, r)).toBe(false);
  });
});

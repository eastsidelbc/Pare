/** Leans lab: frozen-before-the-week grading, the promotion bar, retirement + cap. */
import { describe, expect, it } from 'vitest';
import type { FeatureRow } from '../backtestV2';
import { addChallengers, gradeWeek, LAB, newLedger, recordOf, verdictOf } from '../research/lab';
import type { Rule, Scored } from '../research/search';

const UNDER: Rule = { market: 'rec:WR', side: 'under', conds: [{ feature: 'x', op: '>=', threshold: 0.5 }] };

function row(week: number, x: number, actual: number, v1: 'over' | 'under' | null = null): FeatureRow {
  return { season: 2026, week, market: 'rec:WR', stat: 'rec', position: 'WR', playerId: `p${week}${x}${actual}`, line: 4.5, actual, overPrice: null, underPrice: null, sigs: [], v1, f: { x } };
}

describe('leans lab', () => {
  it('grades only entries frozen before the week; champion = the v1 verdict', () => {
    let l = newLedger(2026, 7, [{ rule: UNDER, source: 'seed' }]);
    l = gradeWeek(l, [row(6, 1, 3), row(7, 1, 3), row(7, 1, 6), row(7, 0, 3, 'over')], 6);
    expect(l.entries.every((e) => e.results.length === 0)).toBe(true);
    l = gradeWeek(l, [row(7, 1, 3), row(7, 1, 6), row(7, 0, 3, 'over')], 7);
    const [champ, c] = l.entries;
    expect(c.results).toEqual([{ week: 7, wins: 1, losses: 1 }]);
    expect(champ.results).toEqual([{ week: 7, wins: 0, losses: 1 }]);
    expect(gradeWeek(l, [row(7, 1, 3)], 7).entries[1].results).toHaveLength(1); // never twice
  });
  it('near-copies (same bets, reordered conditions) are not added twice', () => {
    const l = newLedger(2026, 7, [{ rule: UNDER, source: 'seed' }]);
    const rows = [0.2, 0.6, 0.7, 0.9].map((x, i) => row(5, x, i % 2 ? 3 : 6));
    const copy: Scored = { ...UNDER, conds: [{ feature: 'x', op: '>=', threshold: 0.55 }], n: 200, w: 140, n1: 100, w1: 70, n2: 100, w2: 70, breakeven: 0.54, score: 0.1 };
    const next = addChallengers(l, [copy], 8, 'search after W7', rows);
    expect(next.entries.filter((e) => e.firstWeek === 8)).toHaveLength(0);
  });
  it('ready only with ≥ 60 forward bets, p < 0.05 and a better ROI than the champion', () => {
    const l = newLedger(2026, 7, [{ rule: UNDER, source: 'seed' }]);
    const hot = { ...l, entries: [{ ...l.entries[0], results: [{ week: 7, wins: 30, losses: 30 }] }, { ...l.entries[1], results: [{ week: 7, wins: 42, losses: 20 }] }] };
    expect(verdictOf(hot, hot.entries[1]).status).toBe('ready');
    const thin = { ...hot, entries: [hot.entries[0], { ...hot.entries[1], results: [{ week: 7, wins: 20, losses: 5 }] }] };
    expect(verdictOf(thin, thin.entries[1]).status).toBe('watching');
    expect(recordOf([{ week: 7, wins: 11, losses: 10 }]).roi).toBeCloseTo((11 * (100 / 110) - 10) / 21, 6);
  });
  it('adds new challengers (no duplicates), retires losers, keeps the active cap', () => {
    const l = newLedger(2026, 7, [{ rule: UNDER, source: 'seed' }]);
    const losing = { ...l, entries: [l.entries[0], { ...l.entries[1], results: [{ week: 7, wins: 20, losses: 45 }] }] };
    const s = (t: number): Scored => ({ ...UNDER, conds: [{ feature: 'x', op: '>=', threshold: t }], n: 200, w: 140, n1: 100, w1: 70, n2: 100, w2: 70, breakeven: 0.54, score: 0.1 });
    const next = addChallengers(losing, [s(0.5), s(0.6), s(0.7), s(0.8), s(0.9)], 8, 'search after W7');
    const ch = next.entries.filter((e) => e.kind === 'challenger');
    expect(ch.filter((e) => e.firstWeek === 8)).toHaveLength(LAB.newPerWeek); // 0.5 = duplicate of the seed, skipped
    expect(ch.filter((e) => e.firstWeek === 8).map((e) => e.id)).toEqual(['c2', 'c3', 'c4']);
    expect(ch.find((e) => e.id === 'c1')?.retired?.reason).toContain('losing');
    expect(new Set(next.entries.map((e) => e.id)).size).toBe(next.entries.length); // ids never repeat
  });
});

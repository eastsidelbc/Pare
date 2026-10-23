import { describe, expect, it } from 'vitest';
import {
  americanToDecimal,
  breakevenProb,
  coverProb,
  decimalToAmerican,
  edge,
  expectedValue,
  impliedProb,
  nearKeyNumber,
  noVig,
  spreadWinProb,
  totalOverProb,
} from '@/lib/formulas/odds';

describe('odds — prices', () => {
  it('implied probability', () => {
    expect(impliedProb(-110)).toBeCloseTo(0.5238, 4);
    expect(impliedProb(150)).toBeCloseTo(0.4, 10);
    expect(impliedProb(-200)).toBeCloseTo(0.6667, 4);
  });
  it('no-vig: a -110 / -110 market is 50 / 50', () => {
    const p = impliedProb(-110) ?? 0;
    expect(noVig(p, p)).toEqual({ a: 0.5, b: 0.5 });
    const fav = impliedProb(-218) ?? 0;
    const dog = impliedProb(180) ?? 0;
    const nv = noVig(fav, dog);
    expect((nv?.a ?? 0) + (nv?.b ?? 0)).toBeCloseTo(1, 10);
    // −218 → 0.6855, +180 → 0.3571; 0.6855 / 1.0427 = 0.6575
    expect(nv?.a).toBeCloseTo(0.6575, 3);
  });
  it('american ⇄ decimal', () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.9091, 4);
    expect(americanToDecimal(150)).toBe(2.5);
    expect(decimalToAmerican(2.5)).toBe(150);
    expect(decimalToAmerican(1.9091)).toBeCloseTo(-110, 0);
  });
  it('breakeven at standard juice is 52.4%', () => {
    expect(breakevenProb()).toBeCloseTo(0.5238, 4);
  });
  it('expected value: a fair coin at -110 loses ~4.5%', () => {
    expect(expectedValue(0.5, -110)).toBeCloseTo(-0.04545, 4);
    expect(expectedValue(0.6, 100)).toBeCloseTo(0.2, 10);
  });
});

describe('odds — lines', () => {
  it('spread → win %: +3 projected ≈ 59.5% (SD 12.5)', () => {
    expect(spreadWinProb(3)).toBeCloseTo(0.5948, 3);
    expect(spreadWinProb(0)).toBeCloseTo(0.5, 7);
  });
  it('cover %: projected +3 laying -3 is a coin flip', () => {
    expect(coverProb(3, -3)).toBeCloseTo(0.5, 7);
    expect(coverProb(7, -3)).toBeGreaterThan(0.6);
  });
  it('total over %', () => {
    // Φ(3 / 12.8)
    expect(totalOverProb(47, 44)).toBeCloseTo(0.5927, 3);
  });
  it('key numbers: on / near / none', () => {
    expect(nearKeyNumber(-3, 'spread')).toBe('on');
    expect(nearKeyNumber(3.5, 'spread')).toBe('near');
    expect(nearKeyNumber(5, 'spread')).toBe('none');
    expect(nearKeyNumber(44.5, 'total')).toBe('near');
  });
  it('edge', () => {
    expect(edge(27.5, 24.5)).toBe(3);
  });
});

describe('odds — null guards', () => {
  it('bad prices → null', () => {
    expect(impliedProb(0)).toBeNull();
    expect(impliedProb(50)).toBeNull();
    expect(americanToDecimal(Number.NaN)).toBeNull();
    expect(decimalToAmerican(1)).toBeNull();
    expect(noVig(0, 0)).toBeNull();
    expect(expectedValue(1.2)).toBeNull();
    expect(edge(Number.NaN, 1)).toBeNull();
  });
});

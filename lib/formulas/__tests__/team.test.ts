import { describe, expect, it } from 'vitest';
import {
  blendForm,
  explosiveRate,
  fumbleRecoveryRate,
  matchupEdgeZ,
  oneScoreRecord,
  paceFactor,
  pareRating,
  pointsPerDrive,
  projectedMargin,
  projectedTotal,
  pythagLuck,
  pythagWinPct,
  pythagWins,
  secondsPerPlay,
  sosAdjust,
  turnoverDiff,
} from '@/lib/formulas/team';

describe('team — Pythagorean', () => {
  it('PF 400 / PA 300 → 66.4%', () => {
    expect(pythagWinPct(400, 300)).toBeCloseTo(0.6641, 3);
    expect(pythagWinPct(300, 300)).toBeCloseTo(0.5, 10);
  });
  it('wins + luck: 12-5 on PF 400 / PA 300 ≈ +0.71', () => {
    expect(pythagWins(400, 300, 17)).toBeCloseTo(11.29, 1);
    expect(pythagLuck(12, 17, 400, 300)).toBeCloseTo(0.71, 1);
    expect(pythagLuck(8, 17, 300, 300, 1)).toBeCloseTo(0, 10);
  });
});

describe('team — efficiency', () => {
  it('ratios', () => {
    expect(pointsPerDrive(408, 170)).toBeCloseTo(2.4, 10);
    expect(explosiveRate(40, 20, 1000)).toBeCloseTo(0.06, 10);
    expect(secondsPerPlay(1800, 60)).toBe(30);
    expect(fumbleRecoveryRate(6, 10)).toBe(0.6);
    expect(turnoverDiff(25, 18)).toBe(7);
  });
  it('matchup edge + SOS + blend', () => {
    expect(matchupEdgeZ(1.2, 0.6)).toBeCloseTo(1.8, 10);
    // gained 380/G against defenses that allow 360 when league avg is 340 → really 360
    expect(sosAdjust(380, 360, 340)).toBe(360);
    expect(blendForm(20, 30)).toBeCloseTo(24, 10);
  });
});

describe('team — projections', () => {
  it('margin = rating gap ± home field', () => {
    expect(projectedMargin(5, -2, 'home')).toBeCloseTo(8.5, 10);
    expect(projectedMargin(5, -2, 'away')).toBeCloseTo(5.5, 10);
    expect(projectedMargin(5, -2, 'neutral')).toBe(7);
  });
  it('total = blended scoring × pace', () => {
    expect(projectedTotal(24, 20, 22, 26, 1)).toBe(46);
    expect(paceFactor(66, 64, 65)).toBe(1);
    expect(projectedTotal(24, 20, 22, 26, 1.1)).toBeCloseTo(50.6, 10);
  });
  it('Pare Rating: all +1 z → +1', () => {
    expect(pareRating({ netYardsPerPlay: 1, pointsPerDrive: 1, turnoverDiffPerGame: 1, thirdDownPct: 1, redZoneTdPct: 1 })).toBeCloseTo(1, 10);
  });
  it('one-score record', () => {
    expect(oneScoreRecord([3, -7, 21, 0, -8, -9])).toEqual({ wins: 1, losses: 2, ties: 1 });
  });
});

describe('team — null guards', () => {
  it('bad input → null', () => {
    expect(pythagWinPct(0, 0)).toBeNull();
    expect(pythagWinPct(-1, 3)).toBeNull();
    expect(pointsPerDrive(10, 0)).toBeNull();
    expect(projectedMargin(Number.NaN, 1, 'home')).toBeNull();
    expect(pareRating({ netYardsPerPlay: Number.NaN, pointsPerDrive: 1, turnoverDiffPerGame: 1, thirdDownPct: 1, redZoneTdPct: 1 })).toBeNull();
    expect(paceFactor(60, 60, 0)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import {
  addResult,
  calibrate,
  gradeCover,
  gradeMoneyline,
  gradeOverUnder,
  hitPct,
  pickMainLine,
  profit,
  replayGameLeans,
  replayPropLeans,
  roi,
  teamRatings,
  type BacktestGame,
  type PlayerSeason,
  type TallyMap,
} from '@/lib/leans/backtest';
import type { TeamGame } from '@/lib/leans/types';

describe('backtest — grading', () => {
  it('over / under with a push on the number', () => {
    expect(gradeOverUnder('over', 44.5, 45)).toBe('win');
    expect(gradeOverUnder('under', 44.5, 45)).toBe('loss');
    expect(gradeOverUnder('over', 44, 44)).toBe('push');
  });
  it('spread: margin + line', () => {
    expect(gradeCover(4, -3)).toBe('win');
    expect(gradeCover(3, -3)).toBe('push');
    expect(gradeCover(-2, 3)).toBe('win');
    expect(gradeCover(-4, 3)).toBe('loss');
  });
  it('moneyline: a tie refunds', () => {
    expect(gradeMoneyline(1)).toBe('win');
    expect(gradeMoneyline(0)).toBe('push');
  });
  it('profit at the price, -110 when missing', () => {
    expect(profit('win', 150)).toBeCloseTo(1.5, 10);
    expect(profit('win', null)).toBeCloseTo(0.9091, 4);
    expect(profit('loss', 150)).toBe(-1);
    expect(profit('push', null)).toBe(0);
  });
});

describe('backtest — main line', () => {
  it('priced: the offer closest to even', () => {
    const main = pickMainLine([
      { target: 49.5, over: -300, under: 220 },
      { target: 59.5, over: -112, under: -108 },
      { target: 69.5, over: 180, under: -240 },
    ]);
    expect(main?.target).toBe(59.5);
  });
  it('ESPN shape: the over and under come as two items on the same target; the ladder is unpriced', () => {
    const main = pickMainLine([
      { target: 19.5, over: null, under: null },
      { target: 7.5, over: null, under: -110 },
      { target: 29.5, over: null, under: null },
      { target: 7.5, over: -120, under: null },
    ]);
    expect(main).toEqual({ target: 7.5, over: -120, under: -110 });
  });
  it('one-way priced (anytime TD) keeps the priced side; nothing priced → null', () => {
    expect(pickMainLine([{ target: 0.5, over: 150, under: null }])).toEqual({ target: 0.5, over: 150, under: null });
    expect(pickMainLine([{ target: 70.5, over: null, under: null }])).toBeNull();
    expect(pickMainLine([])).toBeNull();
  });
});

describe('backtest — tallies', () => {
  it('hit % ignores pushes; ROI per unit staked', () => {
    const m: TallyMap = new Map();
    addResult(m, 'k', 'win', null);
    addResult(m, 'k', 'win', null);
    addResult(m, 'k', 'loss', null);
    addResult(m, 'k', 'push', null);
    const t = m.get('k');
    expect(t?.bets).toBe(4);
    expect(t && hitPct(t)).toBeCloseTo(2 / 3, 10);
    expect(t && roi(t)).toBeCloseTo((2 * 0.909091 - 1) / 4, 4);
  });
});

// Two teams, five weeks: AAA blows everyone out, BBB gets blown out — the engine's
// spread signals all agree by week 6 (needs 4+ games and the league ranks).
function log(): TeamGame[] {
  const out: TeamGame[] = [];
  const teams = ['AAA', 'BBB', ...Array.from({ length: 20 }, (_, i) => `T${String(i).padStart(2, '0')}`)];
  for (let w = 1; w <= 5; w++) {
    for (const t of teams) {
      const strong = t === 'AAA';
      const weak = t === 'BBB';
      out.push({ team: t, opp: 'X', week: w, points: strong ? 35 : weak ? 7 : 20, pointsAllowed: strong ? 10 : weak ? 30 : 20 });
    }
  }
  return out;
}

const game = (over: Partial<BacktestGame>): BacktestGame => ({
  eventId: '1',
  week: 6,
  away: 'BBB',
  home: 'AAA',
  awayScore: 10,
  homeScore: 31,
  spreadLine: { team: 'AAA', line: -7 },
  hasSpread: true,
  total: 60,
  moneyline: { away: 300, home: -400 },
  ...over,
});

describe('backtest — engine replay', () => {
  it('grades the spread lean the engine makes', () => {
    const r = replayGameLeans(log(), [game({})]);
    expect(r.verdicts.get('spread:side')).toBe(1);
    expect(r.tallies.get('spread')?.wins).toBe(1);
  });
  it('team ratings shrink toward average', () => {
    const ratings = teamRatings(log(), 6);
    const aaa = ratings.get('AAA');
    expect(aaa?.games).toBe(5);
    expect(aaa?.rating).toBeGreaterThan(0);
    expect(aaa?.rating).toBeLessThan(25);
  });
  it('a prop for a player who did not play that week is voided', () => {
    const players = new Map<string, PlayerSeason>([['p1', { playerId: 'p1', position: 'RB', games: [] }]]);
    const r = replayPropLeans(
      [{ eventId: '1', week: 6, playerId: 'p1', position: 'RB', opp: 'BBB', stat: 'rush_yd', line: 60.5, overPrice: null, underPrice: null }],
      players,
      {},
    );
    expect(r.voided).toBe(1);
    expect(r.graded).toBe(0);
  });
  it('an UNDER lean on a prop with only an over price (anytime TD) is not graded', () => {
    // 5 games, no TDs, against a defense with no rating → the engine can't lean UNDER (tier missing),
    // so drive the check through a priced-over-only prop and confirm nothing is tallied for under.
    const games = [1, 2, 3, 4, 5].map((week) => ({ week, opp: 'X', rush_yd: 0, rec: 0, rec_yd: 0, rush_td: 0, rec_td: 0 }));
    const players = new Map<string, PlayerSeason>([['p1', { playerId: 'p1', position: 'WR', games: [...games, { ...games[0], week: 6 }] }]]);
    const r = replayPropLeans(
      [{ eventId: '1', week: 6, playerId: 'p1', position: 'WR', opp: 'BBB', stat: 'anytime_td', line: 0.5, overPrice: 250, underPrice: null }],
      players,
      {},
    );
    expect(r.graded).toBe(1);
    expect(r.tallies.get('anytime_td under')).toBeUndefined();
  });
});

describe('backtest — calibration', () => {
  it('residuals vs the line + market baselines', () => {
    const c = calibrate([game({ homeScore: 30, awayScore: 20 }), game({ homeScore: 20, awayScore: 20 })]);
    // home margins 10 and 0 with home line −7 → residuals 3 and −7
    expect(c.marginResidualMean).toBe(-2);
    expect(c.favoriteCoverPct).toBe(0.5);
    expect(c.overPct).toBe(0);
  });
});

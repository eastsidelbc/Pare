import { describe, expect, it } from 'vitest';
import type { MatchupRating } from '@/lib/myteam/rating';
import type { MatchupTier } from '@/lib/myteam/types';
import { propHits, propLean, statValue } from '../propLean';
import type { PlayerGame, PropSide, PropStat } from '../types';

const LABEL: Record<MatchupTier, string> = { great: 'Great', good: 'Good', avg: 'Avg', tough: 'Tough', avoid: 'Avoid' };
const rating = (tier: MatchupTier, rank: number): MatchupRating => ({
  tier, label: LABEL[tier], rank, isTied: false, formattedRank: `${rank}th`, perGame: 20, text: `${LABEL[tier]} · #${rank}`,
});

/** Games W1…Wn with one stat set per week. */
const games = (stat: 'rush_yd' | 'rec_yd' | 'rec', values: number[]): PlayerGame[] =>
  values.map((v, i) => ({ week: i + 1, opp: 'LV', rush_yd: 0, rec: 0, rec_yd: 0, rush_td: 0, rec_td: 0, [stat]: v }));

const lean = (g: PlayerGame[], line: number, tier: MatchupRating | null, side: PropSide = 'over', stat: PropStat = 'rush_yd') =>
  propLean({ games: g, stat, line, side, position: 'RB', rating: tier });

describe('propLean — DECISIONS §6 (3 signals, all must agree)', () => {
  it('3/4 + 4/6 + Great → over (the Bijan mockup)', () => {
    const r = lean(games('rush_yd', [64, 92, 112, 71, 97, 104]), 85.5, rating('great', 30));
    expect(r.verdict).toBe('over');
    expect(r.okCount).toBe(3);
    expect(r.last).toEqual({ over: 3, games: 4 });
    expect(r.season).toEqual({ over: 4, games: 6 });
    expect(r.signals.map((s) => s.label)).toEqual([
      '**3 of last 4** games over 85.5',
      '**4 of 6** this season (67%)',
      'Matchup **Great #30** for RBs',
    ]);
  });

  it('2/4 + 3/6 + Avg → none (the London mockup)', () => {
    const r = lean(games('rec_yd', [88, 59, 71, 48, 66, 52]), 64.5, rating('avg', 17), 'over', 'rec_yd');
    expect(r.verdict).toBe('none');
    expect(r.okCount).toBe(0);
    expect(r.signals.every((s) => !s.ok)).toBe(true);
    expect(r.signals[1].label).toBe('**3 of 6** this season (50%)');
  });

  it('3 games → not-enough, checks still listed', () => {
    const r = lean(games('rush_yd', [120, 130, 140]), 85.5, rating('great', 31));
    expect(r.verdict).toBe('not-enough');
    expect(r.signals).toHaveLength(3);
    expect(r.short).toBe('Not enough games yet');
  });

  it('under mirror: ≤1 of 4 + ≤40% + Tough → under', () => {
    const r = lean(games('rush_yd', [40, 50, 90, 30, 45, 20]), 55.5, rating('tough', 8), 'under');
    expect(r.verdict).toBe('under');
    expect(r.signals[0].label).toBe('**3 of last 4** games under 55.5');
    expect(r.signals[1].label).toBe('**5 of 6** under this season (83%)');
  });

  it('under mirror needs the tier too (Avg → none)', () => {
    expect(lean(games('rush_yd', [40, 50, 90, 30, 45, 20]), 55.5, rating('avg', 15), 'under').verdict).toBe('none');
  });

  it('the data can lean against the side the user typed', () => {
    const r = lean(games('rush_yd', [64, 92, 112, 71, 97, 104]), 85.5, rating('good', 24), 'under');
    expect(r.verdict).toBe('over');
  });

  it('exactly 60% counts; a push is not over', () => {
    // 3 of 5 over = 60% (90, 90, 90); 85 on an 85 line is a push, not over.
    const r = lean(games('rush_yd', [90, 80, 90, 90, 85]), 85, rating('great', 29));
    expect(r.hits.map((h) => h.over)).toEqual([true, false, true, true, false]);
    expect(r.season).toEqual({ over: 3, games: 5 });
    expect(r.verdict).toBe('none'); // last 4 = 2 of 4
  });

  it('no matchup rating → that check fails, no lean', () => {
    const r = lean(games('rush_yd', [100, 100, 100, 100, 100]), 85.5, null);
    expect(r.verdict).toBe('none');
    expect(r.signals[2]).toEqual({ ok: false, label: 'No matchup rating for RBs yet' });
  });
});

describe('statValue / propHits', () => {
  const g: PlayerGame = { week: 3, opp: 'KC', rush_yd: 40, rec: 4, rec_yd: 35, rush_td: 0, rec_td: 1 };
  it('rush + rec yds sums; anytime TD counts both TD kinds', () => {
    expect(statValue(g, 'rush_rec_yd')).toBe(75);
    expect(statValue(g, 'anytime_td')).toBe(1);
    expect(statValue(g, 'rec')).toBe(4);
  });
  it('anytime TD ignores the typed line (1+ TD = over)', () => {
    expect(propHits([g, { ...g, week: 4, rec_td: 0 }], 'anytime_td', 99)).toEqual([
      { week: 3, value: 1, over: true },
      { week: 4, value: 0, over: false },
    ]);
  });
  it('sorts by week', () => {
    const out = propHits([{ ...g, week: 5 }, { ...g, week: 1 }], 'rush_yd', 30);
    expect(out.map((h) => h.week)).toEqual([1, 5]);
  });
});

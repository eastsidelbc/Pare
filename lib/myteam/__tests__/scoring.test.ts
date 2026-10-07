import { describe, it, expect } from 'vitest';
import { findUnseenScoringKeys, receptionFormat, scoringHash, toScoringRules } from '../sleeper/scoring';
import { scoreLine } from '../fpa';
import { loadFixture, type SleeperComLine } from './fixtures';

const league = loadFixture<{ scoring_settings: Record<string, number> }>('sleeper-league.json');
const week4 = loadFixture<SleeperComLine[]>('sleeper-com-stats-w4.json');

/** Sleeper's default PPR rules for offensive players (+ st_ff, seen in fixture). */
const SLEEPER_DEFAULT_PPR = {
  pass_yd: 0.04, pass_td: 4, pass_int: -1, pass_2pt: 2,
  rush_yd: 0.1, rush_td: 6, rush_2pt: 2,
  rec: 1, rec_yd: 0.1, rec_td: 6, rec_2pt: 2,
  fum_lost: -2, fum_rec_td: 6, st_ff: 1,
};

describe('toScoringRules', () => {
  it('maps the fixture league 1:1, drops zero weights, reports nothing invalid', () => {
    const { rules, invalid } = toScoringRules(league.scoring_settings);
    expect(invalid).toEqual([]);
    expect(rules.rec).toBe(1);
    expect(Object.values(rules).every((w) => w !== 0)).toBe(true);
    const zeroKeys = Object.entries(league.scoring_settings).filter(([, w]) => w === 0).map(([k]) => k);
    for (const k of zeroKeys) expect(rules).not.toHaveProperty(k);
  });
  it('reports non-numeric values instead of zeroing them; accepts numeric strings', () => {
    const { rules, invalid } = toScoringRules({ rec: '0.5', pass_td: 'four', rush_td: null, rush_yd: 0.1 });
    expect(rules).toEqual({ rec: 0.5, rush_yd: 0.1 });
    expect(invalid.sort()).toEqual(['pass_td', 'rush_td']);
  });
  it('handles null settings', () => {
    expect(toScoringRules(null)).toEqual({ rules: {}, invalid: [] });
  });
});

describe('PPR / half / std known totals', () => {
  const line = { rec: 5, rec_yd: 80, rec_td: 1 };
  const base = { rec_yd: 0.1, rec_td: 6 };
  it('5 rec, 80 yds, 1 TD = 19 PPR / 16.5 half / 14 std', () => {
    const ppr = toScoringRules({ ...base, rec: 1 }).rules;
    const half = toScoringRules({ ...base, rec: 0.5 }).rules;
    const std = toScoringRules({ ...base, rec: 0 }).rules;
    expect(scoreLine(line, ppr)).toBe(19);
    expect(scoreLine(line, half)).toBe(16.5);
    expect(scoreLine(line, std)).toBe(14);
    expect([receptionFormat(ppr), receptionFormat(half), receptionFormat(std)]).toEqual(['ppr', 'half', 'std']);
  });
  it('QB line: 300 yds, 2 TD, 1 INT = 12 + 8 - 1 = 19 with Sleeper defaults', () => {
    expect(scoreLine({ pass_yd: 300, pass_td: 2, pass_int: 1 }, SLEEPER_DEFAULT_PPR)).toBe(19);
  });
  it('missing stat keys score 0', () => {
    expect(scoreLine({}, SLEEPER_DEFAULT_PPR)).toBe(0);
  });
});

describe('oracle: Sleeper default PPR reproduces pts_ppr on every week-4 skill line', () => {
  it('QB/RB/WR/TE lines match to the cent', () => {
    const skill = week4.filter((l) => ['QB', 'RB', 'WR', 'TE'].includes(l.player.position));
    expect(skill.length).toBeGreaterThan(400);
    const misses = skill.filter((l) => Math.abs(scoreLine(l.stats, SLEEPER_DEFAULT_PPR) - (l.stats.pts_ppr ?? 0)) > 0.005);
    expect(misses).toEqual([]);
  });
});

describe('findUnseenScoringKeys', () => {
  it('lists weighted keys absent from observed stat keys', () => {
    expect(findUnseenScoringKeys({ rec: 1, pts_allow_0: 10, fum_rec_td: 6 }, new Set(['rec']))).toEqual(['fum_rec_td', 'pts_allow_0']);
  });
});

describe('scoringHash', () => {
  it('is independent of key order and changes with any weight', () => {
    expect(scoringHash({ rec: 1, rec_yd: 0.1 })).toBe(scoringHash({ rec_yd: 0.1, rec: 1 }));
    expect(scoringHash({ rec: 1, rec_yd: 0.1 })).not.toBe(scoringHash({ rec: 0.5, rec_yd: 0.1 }));
    expect(scoringHash({})).toMatch(/^[0-9a-f]{8}$/);
  });
});

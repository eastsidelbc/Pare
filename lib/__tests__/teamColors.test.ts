import { describe, it, expect } from 'vitest';
import { NFL_TEAMS } from '@/lib/teams';
import {
  getMatchupPalettes, liftForDark, contrastRatio, deltaE,
  COMPARE_BG, MIN_CONTRAST, CLASH_DELTA_E, TEAM_COLOR_ABBRS,
} from '@/lib/teamColors';

describe('team color table', () => {
  it('has colors for all 32 teams (and nothing extra)', () => {
    expect(new Set(TEAM_COLOR_ABBRS)).toEqual(new Set(NFL_TEAMS.map((t) => t.abbr)));
  });
});

describe('liftForDark (rule 1)', () => {
  it('lifts dark navy until it reads on the black background', () => {
    const lifted = liftForDark('#00338D'); // Bills royal blue — ~1.7:1 raw
    expect(contrastRatio('#00338D', COMPARE_BG)).toBeLessThan(MIN_CONTRAST);
    expect(contrastRatio(lifted, COMPARE_BG)).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });
  it('leaves already-bright colors alone', () => {
    expect(liftForDark('#FFB612')).toBe('#FFB612');
  });
  it('every team bar color clears the contrast floor in every matchup', () => {
    for (const a of NFL_TEAMS) {
      const { a: pa } = getMatchupPalettes(a.name, 'Kansas City Chiefs');
      expect(contrastRatio(pa.base, COMPARE_BG)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });
});

describe('getMatchupPalettes (rules 2 + 3)', () => {
  it('KC vs BUF keeps both team colors', () => {
    expect(getMatchupPalettes('Kansas City Chiefs', 'Buffalo Bills').source).toBe('team');
  });
  it('KC vs TB (two reds) swaps the right side', () => {
    const r = getMatchupPalettes('Kansas City Chiefs', 'Tampa Bay Buccaneers');
    expect(r.source).not.toBe('team');
  });
  it('NYG vs BUF (two blues) swaps the right side', () => {
    expect(getMatchupPalettes('New York Giants', 'Buffalo Bills').source).not.toBe('team');
  });
  it('unknown team (e.g. league average) falls back to classic green/fire', () => {
    expect(getMatchupPalettes('League Average', 'Buffalo Bills').source).toBe('fallback');
  });
  it('no matchup of the 32×32 ever ends up with two look-alike colors', () => {
    for (const a of NFL_TEAMS) {
      for (const b of NFL_TEAMS) {
        if (a.abbr === b.abbr) continue;
        const r = getMatchupPalettes(a.name, b.name);
        expect(deltaE(r.a.base, r.b.base), `${a.abbr} vs ${b.abbr}`).toBeGreaterThanOrEqual(CLASH_DELTA_E);
      }
    }
  });
  it('outline color is a brighter tint of the base', () => {
    const { a } = getMatchupPalettes('Kansas City Chiefs', 'Buffalo Bills');
    expect(contrastRatio(a.line, COMPARE_BG)).toBeGreaterThan(contrastRatio(a.base, COMPARE_BG));
  });
});

describe('getTeamPalette', () => {
  it('returns a lifted palette for every team and null for League Average', async () => {
    const { getTeamPalette } = await import('@/lib/teamColors');
    for (const t of NFL_TEAMS) {
      const p = getTeamPalette(t.name);
      expect(p).not.toBeNull();
      expect(contrastRatio(p!.base, COMPARE_BG)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
    expect(getTeamPalette('Avg Team')).toBeNull();
  });
});

describe('Home game card text (solid team-color abbreviations, 24px bold)', () => {
  // WCAG "large text" (≥ 18.66px bold) needs 3:1. The card's lightest stop is
  // --card-deep-a (#151520, globals.css) — check against it, the worst case.
  const CARD_DEEP_A = '#151520';
  it('every team line color reads as large text on the deep card, in every matchup', () => {
    for (const a of NFL_TEAMS) {
      for (const b of NFL_TEAMS) {
        if (a.abbr === b.abbr) continue;
        const r = getMatchupPalettes(a.name, b.name);
        expect(contrastRatio(r.a.line, CARD_DEEP_A), `${a.abbr} (vs ${b.abbr})`).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(r.b.line, CARD_DEEP_A), `${b.abbr} (vs ${a.abbr})`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

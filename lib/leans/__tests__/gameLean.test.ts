import { describe, expect, it } from 'vitest';
import { gameLeans, leagueForm, lineFor, moneylineLean, spreadLean, totalLean } from '../gameLean';
import type { TeamGame } from '../types';

const WEEKS = [1, 2, 3, 4, 5, 6];

/** 30 filler teams that score 21 and allow 21 every week (margin 0, total 42). */
const filler: TeamGame[] = Array.from({ length: 30 }, (_, i) => `F${i + 1}`).flatMap((team) =>
  WEEKS.map((week) => ({ team, opp: 'X', week, points: 21, pointsAllowed: 21 })),
);
const team = (name: string, points: number, allowed: number, weeks = WEEKS): TeamGame[] =>
  weeks.map((week) => ({ team: name, opp: 'X', week, points, pointsAllowed: allowed }));
const log = (...teams: TeamGame[][]) => [...filler, ...teams.flat()];

describe('totalLean — DECISIONS §6', () => {
  it('total under: both bottom-10, averages below, under 4 of 4 for both', () => {
    const league = leagueForm(log(team('ATL', 14, 24), team('LV', 13, 24)), 7);
    const r = totalLean('ATL', 'LV', 44.5, league);
    expect(r.verdict).toBe('under');
    expect(r.okCount).toBe(3);
    expect(r.signals[0].label).toBe('Both offenses bottom-10 in points, last 4 (**ATL #31 · LV #32**)');
    expect(r.signals[1].label).toBe('Their games average **38.0** and **37.0** pts, last 4');
    expect(r.signals[2].label).toBe('Under hit in **4 of 4** for both teams');
    expect(r.cells.away.every((c) => c.under)).toBe(true);
    expect(r.short).toBe('Both offenses bottom-10 in pts, last 4');
  });

  it('total over: both top-10, averages above, over 4 of 4', () => {
    const r = totalLean('DET', 'CHI', 48.5, leagueForm(log(team('DET', 30, 24), team('CHI', 31, 20)), 7));
    expect(r.verdict).toBe('over');
    expect(r.signals[0].label).toContain('top-10');
  });

  it('total none: one offense top, one bottom → the rank check fails', () => {
    const r = totalLean('ATL', 'LV', 44.5, leagueForm(log(team('ATL', 14, 24), team('LV', 30, 24)), 7));
    expect(r.verdict).toBe('none');
    expect(r.signals[0].ok).toBe(false);
    expect(r.signals).toHaveLength(3);
  });

  it('no total posted → no lean, checks still shown', () => {
    const r = totalLean('ATL', 'LV', null, leagueForm(log(team('ATL', 14, 24), team('LV', 13, 24)), 7));
    expect(r.verdict).toBe('none');
    expect(r.summary).toBe('No total posted yet');
    expect(r.signals).toHaveLength(3);
  });

  it('only games before the week count (week 4 → 3 games → not-enough)', () => {
    const r = totalLean('ATL', 'LV', 44.5, leagueForm(log(team('ATL', 14, 24), team('LV', 13, 24)), 4));
    expect(r.verdict).toBe('not-enough');
  });
});

describe('spreadLean / moneylineLean — conservative, 3 signals', () => {
  const dominant = () => leagueForm(log(team('ATL', 14, 20), team('LV', 30, 18)), 7);

  it('side: margin gap, season rank gap and covers all point to LV', () => {
    const r = spreadLean('ATL', 'LV', { team: 'LV', line: -3.5 }, true, dominant());
    expect(r.verdict).toBe('side');
    expect(r.side).toBe('home');
    expect(r.okCount).toBe(3);
  });

  it('margins too close → none with the mockup reason', () => {
    const league = leagueForm(log(team('ATL', 20, 22), team('LV', 19, 21)), 7);
    const r = spreadLean('ATL', 'LV', { team: 'LV', line: -1.5 }, true, league);
    expect(r.verdict).toBe('none');
    expect(r.summary).toBe('Point margins too close, last 4 (ATL −2, LV −2)');
  });

  it('a big line the favorite never covered → none', () => {
    const r = spreadLean('ATL', 'LV', { team: 'LV', line: -14.5 }, true, dominant());
    expect(r.verdict).toBe('none');
    expect(r.signals[2].ok).toBe(false);
  });

  it('moneyline side: LV won 4 of 4, ATL 0 of 4', () => {
    const r = moneylineLean('ATL', 'LV', true, dominant());
    expect(r.verdict).toBe('side');
    expect(r.side).toBe('home');
    expect(r.signals[2].label).toBe('Won, last 4: **LV 4 of 4 · ATL 0 of 4**');
  });

  it('lineFor mirrors the favorite; pick’em = 0', () => {
    expect(lineFor('home', 'ATL', 'LV', { team: 'LV', line: -1.5 })).toBe(-1.5);
    expect(lineFor('away', 'ATL', 'LV', { team: 'LV', line: -1.5 })).toBe(1.5);
    expect(lineFor('away', 'ATL', 'LV', null)).toBe(0);
  });
});

describe('gameLeans — all three lines', () => {
  it('headline = the total lean; ML says "Same story as the spread" when both sides split', () => {
    const g = gameLeans(log(team('ATL', 14, 24), team('LV', 13, 24)), {
      awayTeam: 'ATL', homeTeam: 'LV', week: 7, total: 44.5, spreadLine: { team: 'LV', line: -1.5 }, hasSpread: true, hasMoneyline: true,
    });
    expect(g.headline?.line).toBe('total');
    expect(g.headline?.result.verdict).toBe('under');
    expect(g.spread.verdict).toBe('none');
    expect(g.moneyline.summary).toBe('Same story as the spread — no clear side');
  });

  it('nothing agrees → "Data splits on all three lines"', () => {
    const g = gameLeans(log(team('ATL', 20, 22), team('LV', 23, 22)), {
      awayTeam: 'ATL', homeTeam: 'LV', week: 7, total: 46.5, spreadLine: { team: 'LV', line: -6.5 }, hasSpread: true, hasMoneyline: true,
    });
    expect(g.headline).toBeNull();
    expect(g.headlineShort).toBe('Data splits on all three lines');
  });

  it('week 2 → every line not-enough', () => {
    const g = gameLeans(log(team('ATL', 14, 24), team('LV', 13, 24)), {
      awayTeam: 'ATL', homeTeam: 'LV', week: 2, total: 44.5, spreadLine: null, hasSpread: false, hasMoneyline: false,
    });
    expect(g.notEnough).toBe(true);
    expect(g.headlineShort).toBe('Not enough games yet');
  });
});

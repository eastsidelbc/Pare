/**
 * Leans L0 — data facts, proven on fixtures before any Leans code exists
 * (docs/plans/2026-10-14-leans-tab.md "Data availability"). Each block answers
 * one question; a failure here means that UI piece shows "—".
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGameBox, toTeamGameLines, type EspnSummaryResponse } from '@/lib/espnBoxscore';
import { buildFpaTable } from '@/lib/myteam/fpa';
import { rankFpa, rateMatchup } from '@/lib/myteam/rating';
import { toGameLines, type SleeperComLineRaw } from '@/lib/myteam/sleeper/map';

const load = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T;

interface OddsSide { close?: { odds?: string }; open?: { odds?: string } }
interface FixtureEvent {
  shortName: string;
  competitions: Array<{ odds?: Array<{ details?: string; moneyline?: { away?: OddsSide; home?: OddsSide } }> }>;
}

describe('(a) ESPN odds[0] carries a moneyline for away + home', () => {
  const events = load<{ events: FixtureEvent[] }>('../../__fixtures__/espn/scoreboard-odds.json').events;
  const withOdds = events.filter((e) => e.competitions[0].odds?.[0]);

  it('fixture has priced games and one without odds', () => {
    expect(withOdds.length).toBeGreaterThanOrEqual(3);
    expect(events.length - withOdds.length).toBe(1);
  });
  it('moneyline.away/home.close.odds are American odds strings', () => {
    for (const e of withOdds) {
      const ml = e.competitions[0].odds?.[0].moneyline;
      expect(ml?.away?.close?.odds, e.shortName).toMatch(/^[+-]\d{3,4}$/);
      expect(ml?.home?.close?.odds, e.shortName).toMatch(/^[+-]\d{3,4}$/);
    }
  });
  it('details names the favorite + its line ("SEA -2.5")', () => {
    for (const e of withOdds) expect(e.competitions[0].odds?.[0].details).toMatch(/^[A-Z]{2,3} -\d+(\.5)?$/);
  });
});

describe('(b) team game log has points for + against per team per week', () => {
  const summary = load<EspnSummaryResponse>('../../myteam/__fixtures__/espn-summary-boxscore.json');
  const { teams } = parseGameBox(summary);
  const lines = toTeamGameLines([{ week: 4, eventId: 'x', teams }], new Map([['23', 'PIT'], ['5', 'CLE']]));

  it('two lines, mirrored points', () => {
    expect(lines).toHaveLength(2);
    const pit = lines.find((l) => l.team === 'PIT');
    const cle = lines.find((l) => l.team === 'CLE');
    expect(pit).toMatchObject({ opponent: 'CLE', week: 4, points: 24, pointsAllowed: 27 });
    expect(cle).toMatchObject({ opponent: 'PIT', week: 4, points: 27, pointsAllowed: 24 });
  });
});

describe('(c) weekly player lines carry the five prop stats', () => {
  const raw = load<SleeperComLineRaw[]>('../../myteam/__fixtures__/sleeper-com-stats-w4.json');
  const lines = toGameLines(raw);
  const keys = new Set(lines.flatMap((l) => Object.keys(l.stats)));

  it('rush_yd, rec, rec_yd, rush_td, rec_td all occur (absent key = 0)', () => {
    for (const k of ['rush_yd', 'rec', 'rec_yd', 'rush_td', 'rec_td']) expect(keys.has(k), k).toBe(true);
  });
  it('every line has player id, team, opponent, week', () => {
    expect(lines.length).toBeGreaterThan(100);
    for (const l of lines) {
      expect(l.playerId).toBeTruthy();
      expect(l.team).toMatch(/^[A-Z]{2,3}$/);
      expect(l.opponent).toMatch(/^[A-Z]{2,3}$/);
      expect(l.week).toBe(4);
    }
  });
  it('pts_ppr is present, so FPA can be scored as Sleeper PPR', () => {
    expect(keys.has('pts_ppr')).toBe(true);
  });
});

describe('(d) fpa + rating give a tier + rank per position for Season and Last 4', () => {
  const lines = toGameLines(load<SleeperComLineRaw[]>('../../myteam/__fixtures__/sleeper-com-stats-w4.json'));
  const table = buildFpaTable(lines, { pts_ppr: 1 });

  for (const window of ['season', 'last4'] as const) {
    it(`RB ranks, ${window}`, () => {
      const ranks = rankFpa(table, 'RB', window);
      expect(ranks.size).toBeGreaterThanOrEqual(26); // week 4: every team that played
      const [team] = [...ranks.keys()];
      const rating = rateMatchup(ranks, team);
      expect(rating?.tier).toMatch(/^(great|good|avg|tough|avoid)$/);
      expect(rating?.rank).toBeGreaterThanOrEqual(1);
    });
  }
});

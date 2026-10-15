/**
 * Leans L2 — the scoreboard mapper's new line fields (`spreadLine`, `moneyline`),
 * added to `MatchupOdds` without changing the `spread` string Home renders.
 * Fixture: trimmed live week-6 scoreboard (lib/__fixtures__/espn/scoreboard-odds.json).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapEspnScoreboard, parseAmericanOdds, parseSpreadDetails, type EspnScoreboard } from '@/lib/espnScoreboard';

const fixture = JSON.parse(
  readFileSync(new URL('../__fixtures__/espn/scoreboard-odds.json', import.meta.url), 'utf8'),
) as EspnScoreboard;
const matchups = mapEspnScoreboard(fixture, 6);
const byId = (away: string, home: string) => matchups.find((m) => m.away.abbr === away && m.home.abbr === home);

describe('mapEspnScoreboard — Leans line fields', () => {
  it('keeps the spread string exactly as ESPN sent it (Home renders it unchanged)', () => {
    expect(byId('SEA', 'DEN')?.odds?.spread).toBe('SEA -2.5');
    expect(byId('SEA', 'DEN')?.odds?.overUnder).toBe(40.5);
  });
  it('parses the moneyline per side from the closing price', () => {
    expect(byId('SEA', 'DEN')?.odds?.moneyline).toEqual({ away: -142, home: 120 });
    expect(byId('BAL', 'CLE')?.odds?.moneyline).toEqual({ away: -258, home: 210 });
  });
  it('home favorite: spreadLine names the home team', () => {
    const m = byId('HOU', 'JAX');
    expect(m?.odds?.spreadLine).toEqual({ team: 'JAX', line: -2.5 });
    expect(m?.odds?.moneyline).toEqual({ away: 120, home: -142 });
  });
  it('a game without odds stays odds: null', () => {
    const withOdds = matchups.filter((m) => m.odds);
    expect(matchups).toHaveLength(5);
    expect(withOdds).toHaveLength(4);
  });
  it('odds without a moneyline object → moneyline null, spread kept', () => {
    const copy = JSON.parse(JSON.stringify(fixture)) as EspnScoreboard & {
      events: Array<{ competitions: Array<{ odds?: Array<Record<string, unknown>> }> }>;
    };
    delete copy.events[0].competitions[0].odds?.[0].moneyline;
    const [first] = mapEspnScoreboard(copy, 6).filter((m) => m.away.abbr === 'SEA');
    expect(first.odds?.moneyline).toBeNull();
    expect(first.odds?.spread).toBe('SEA -2.5');
  });
  it('falls back to the opening price when the close is missing', () => {
    const copy = JSON.parse(JSON.stringify(fixture)) as {
      events: Array<{ competitions: Array<{ odds?: Array<{ moneyline: { away: { close?: unknown; open: { odds: string } } } }> }> }>;
    };
    delete copy.events[0].competitions[0].odds?.[0].moneyline.away.close;
    const [first] = mapEspnScoreboard(copy as unknown as EspnScoreboard, 6).filter((m) => m.away.abbr === 'SEA');
    expect(first.odds?.moneyline?.away).toBe(-130);
  });
});

describe('parseSpreadDetails / parseAmericanOdds', () => {
  it('reads favorite + line and applies team aliases', () => {
    expect(parseSpreadDetails('KC -8.5')).toEqual({ team: 'KC', line: -8.5 });
    expect(parseSpreadDetails('WSH -3')).toEqual({ team: 'WAS', line: -3 });
  });
  it("pick'em / junk → null", () => {
    expect(parseSpreadDetails('EVEN')).toBeNull();
    expect(parseSpreadDetails('')).toBeNull();
    expect(parseSpreadDetails(undefined)).toBeNull();
  });
  it('American odds strings → numbers', () => {
    expect(parseAmericanOdds('-142')).toBe(-142);
    expect(parseAmericanOdds('+120')).toBe(120);
    expect(parseAmericanOdds('EVEN')).toBe(100);
    expect(parseAmericanOdds('OFF')).toBeNull();
    expect(parseAmericanOdds(undefined)).toBeNull();
  });
});

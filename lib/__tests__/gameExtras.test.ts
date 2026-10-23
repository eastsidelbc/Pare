/**
 * Box-score extras — fixture: KC @ DAL, 2025 W13 (event 401772694), trimmed to the fields read
 * (lib/__fixtures__/espn/summary-final-extras.json, real ESPN shape).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseExtras, sampleSeries, WIN_PROB_POINTS, type EspnExtrasSource } from '@/lib/gameExtras';
import { parseSummary, toWireSummary } from '@/lib/gameSummary';

const fixture = JSON.parse(readFileSync(new URL('../__fixtures__/espn/summary-final-extras.json', import.meta.url), 'utf8')) as EspnExtrasSource;
const extras = parseExtras(fixture);

describe('parseExtras — KC @ DAL', () => {
  it('sides + quarters', () => {
    expect(extras?.away).toBe('KC');
    expect(extras?.home).toBe('DAL');
    expect(extras?.quarters).toEqual({ away: [14, 0, 0, 14], home: [7, 10, 3, 11] });
  });
  it('team stat rows, with the better side', () => {
    const row = (k: string) => extras?.teamStats.find((r) => r.key === k);
    expect(row('totalYards')).toEqual({ key: 'totalYards', label: 'Total yards', away: '362', home: '457', better: 'home' });
    // 5-13 (38%) vs 9-16 (56%)
    expect(row('thirdDownEff')?.better).toBe('home');
    // turnovers 0 vs 1 — fewer is better
    expect(row('turnovers')?.better).toBe('away');
    // penalties 10-119 vs 7-50 — fewer yards is better
    expect(row('totalPenaltiesYards')?.better).toBe('home');
    // possession 29:06 vs 30:54
    expect(row('possessionTime')?.better).toBe('home');
  });
  it('scoring plays in order, with the running score', () => {
    expect(extras?.scoring).toHaveLength(10);
    expect(extras?.scoring[0]).toMatchObject({ quarter: 1, clock: '13:04', team: 'KC', kind: 'TD', away: 7, home: 0 });
    const last = extras?.scoring.at(-1);
    expect([last?.away, last?.home]).toEqual([28, 31]);
  });
  it('win probability sampled, ends on the result', () => {
    expect(extras?.winProb.length).toBe(WIN_PROB_POINTS);
    expect(extras?.winProb.at(-1)).toBe(1);
  });
  it('defensive leaders + kicking per team', () => {
    expect(extras?.defense.KC.length).toBeGreaterThan(0);
    expect(extras?.defense.KC[0].stat).toMatch(/tkl/);
    expect(extras?.kicking.DAL[0].stat).toMatch(/FG/);
  });
  it('venue', () => {
    expect(extras?.venue).toEqual({ name: 'AT&T Stadium', city: 'Arlington, TX', turf: true });
  });
});

describe('extras through the summary pipeline', () => {
  it('parseSummary carries extras and the wire keeps them', () => {
    const wire = toWireSummary(parseSummary(fixture));
    expect(wire.extras?.home).toBe('DAL');
    expect(Object.keys(wire).sort()).toEqual(['byAbbr', 'extras', 'headline']);
  });
  it('a summary with none of it → null (wire unchanged)', () => {
    expect(parseExtras({})).toBeNull();
    expect(Object.keys(toWireSummary(parseSummary({}))).sort()).toEqual(['byAbbr', 'headline']);
  });
});

describe('sampleSeries', () => {
  it('keeps first + last, evenly spaced', () => {
    expect(sampleSeries([0, 1, 2, 3, 4, 5, 6, 7, 8], 3)).toEqual([0, 4, 8]);
    expect(sampleSeries([1, 2], 5)).toEqual([1, 2]);
  });
});

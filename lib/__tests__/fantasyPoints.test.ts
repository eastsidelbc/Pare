import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applySleeperPoints,
  buildPprIndex,
  parePoints,
  pprFor,
  type PointsLine,
  type PprIndex,
} from '../fantasyPoints';
import { scoreLine } from '../myteam/fpa';
import { toGameLines } from '../myteam/sleeper/map';
import type { SleeperComLineRaw } from '../myteam/sleeper/map';

// Same game week: ESPN box score = W4 TNF PIT @ CLE (event 401872964); Sleeper = W4 lines.
const fixture = <T,>(name: string): T =>
  JSON.parse(readFileSync(new URL(`../myteam/__fixtures__/${name}`, import.meta.url), 'utf8')) as T;

interface RawLine extends SleeperComLineRaw {
  player_id: string;
  team: string;
  stats: Record<string, number>;
  player: { position: string; first_name?: string; last_name?: string };
}
interface SlimRaw {
  full_name?: string;
  espn_id?: number | null;
}
interface EspnBox {
  boxscore: {
    players: {
      team: { abbreviation: string };
      statistics: { name: string; athletes: { athlete: { id: string; displayName: string } }[] }[];
    }[];
  };
}

const rawW4 = fixture<RawLine[]>('sleeper-com-stats-w4.json');
const slim = fixture<Record<string, SlimRaw>>('sleeper-players-slim.json');
const espn = fixture<EspnBox>('espn-summary-boxscore.json');
const p0 = JSON.parse(
  readFileSync(new URL('../../docs/plans/2026-10-12-home-sleeper-ppr/p0-check.json', import.meta.url), 'utf8'),
) as { sleeper: { pts_ppr: number; bonusFlags: Record<string, number>; raw: Record<string, number> }; pare: { points: number } };

const linesW4 = toGameLines(rawW4);

/**
 * The production player map (lib/fantasy.ts) covers every player. The slim fixture is a
 * 280-player subset, so names for the rest come from the Sleeper line itself (no ESPN id —
 * those players exercise the name + team fallback).
 */
const players: Record<string, { name: string; espnId?: string }> = {};
for (const l of rawW4) {
  const name = `${l.player.first_name ?? ''} ${l.player.last_name ?? ''}`.trim();
  if (name) players[l.player_id] = { name };
}
for (const [id, p] of Object.entries(slim)) {
  if (p.full_name) players[id] = { name: p.full_name, ...(p.espn_id ? { espnId: String(p.espn_id) } : {}) };
}
const indexW4 = buildPprIndex(linesW4, players);

/** Every ESPN player in the box score with a passing / rushing / receiving line. */
const espnPlayers = espn.boxscore.players.flatMap((t) => {
  const seen = new Map<string, string>();
  for (const c of t.statistics) {
    if (!['passing', 'rushing', 'receiving'].includes(c.name)) continue;
    for (const a of c.athletes) seen.set(a.athlete.id, a.athlete.displayName);
  }
  return [...seen].map(([espnId, fullName]) => ({ espnId, fullName, team: t.team.abbreviation }));
});

const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);

const line = (fullName: string, over: Partial<PointsLine> = {}): PointsLine => ({
  fullName,
  isPasser: false,
  scrimmageYds: 0,
  ppr: null,
  ...over,
});
const emptyIndex: PprIndex = { byEspnId: new Map(), byNameTeam: new Map() };

describe('Pare points (Sleeper pts_ppr + yardage bonus flags)', () => {
  it('pts_ppr is the source: every fixture line scores pts_ppr + 3 per bonus flag', () => {
    let checked = 0;
    for (const l of rawW4) {
      const p = players[l.player_id];
      if (typeof l.stats.pts_ppr !== 'number' || !p || !SKILL.has(l.player.position)) continue;
      const flags =
        (l.stats.bonus_pass_yd_300 ?? 0) +
        (l.stats.bonus_pass_yd_400 ?? 0) +
        (l.stats.bonus_rush_yd_200 ?? 0) +
        (l.stats.bonus_rec_yd_200 ?? 0);
      const expected = Math.round((l.stats.pts_ppr + flags * 3) * 100) / 100;
      expect(pprFor(indexW4, { espnId: p.espnId, fullName: p.name, team: l.team })).toBe(expected);
      checked++;
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('bonus rule: Dak W5 = 17.64; 400+ pass, 200+ rush/rec = +3; other bonuses ignored', () => {
    expect(p0.sleeper.pts_ppr).toBe(14.64);
    expect(parePoints({ pts_ppr: p0.sleeper.pts_ppr, ...p0.sleeper.bonusFlags })).toBe(17.64);
    expect(p0.pare.points).toBe(17.64);
    expect(parePoints({ pts_ppr: 30, bonus_pass_yd_400: 1 })).toBe(33);
    expect(parePoints({ pts_ppr: 30, bonus_rush_yd_200: 1 })).toBe(33);
    expect(parePoints({ pts_ppr: 30, bonus_rec_yd_200: 1 })).toBe(33);
    expect(
      parePoints({ pts_ppr: 20, bonus_rec_yd_100: 1, bonus_rush_yd_100: 1, bonus_fd_qb: 11, bonus_pass_cmp_25: 1 }),
    ).toBe(20);
    // Season totals: Sleeper sums the flags (Dak 2026 through W5: 96.84 + 2 × 300-yd games).
    expect(parePoints({ pts_ppr: 96.84, bonus_pass_yd_300: 2 })).toBe(102.84);
    expect(parePoints({ bonus_pass_yd_300: 1 })).toBeNull();
  });

  it('formula proof: Sleeper standard-PPR rules reproduce pts_ppr on ≥99% of W4 skill lines', () => {
    // Documents what pts_ppr is. Nothing in the app uses these weights.
    const rules = {
      pass_yd: 0.04, pass_td: 4, pass_int: -1, pass_2pt: 2,
      rush_yd: 0.1, rush_td: 6, rush_2pt: 2,
      rec: 1, rec_yd: 0.1, rec_td: 6, rec_2pt: 2,
      fum_lost: -2,
    };
    const skill = linesW4.filter((l) => SKILL.has(l.position) && typeof l.stats.pts_ppr === 'number');
    const hits = skill.filter((l) => Math.abs(scoreLine(l.stats, rules) - (l.stats.pts_ppr ?? 0)) < 0.005);
    expect(skill.length).toBeGreaterThan(200);
    expect(hits.length / skill.length).toBeGreaterThanOrEqual(0.99);
  });

  it('join hit rate: every ESPN QB/RB/WR/TE in the W4 box score gets Pare points', () => {
    expect(espnPlayers.length).toBeGreaterThanOrEqual(15);
    const misses = espnPlayers.filter((p) => pprFor(indexW4, p) === null);
    expect(misses).toEqual([]);
    // Spot check: Deshaun Watson W4 = Sleeper 13.92 (no bonus flags).
    expect(pprFor(indexW4, espnPlayers.find((p) => p.fullName === 'Deshaun Watson')!)).toBe(13.92);
  });

  it('name fallback: no ESPN id still matches by name + team, incl. a Jr. suffix', () => {
    const watson = espnPlayers.find((p) => p.fullName === 'Deshaun Watson')!;
    expect(pprFor(indexW4, { fullName: watson.fullName, team: watson.team })).toBe(13.92);
    // ESPN "Harold Fannin Jr." vs Sleeper "Harold Fannin" (not in the slim map → name only).
    const fannin = espnPlayers.find((p) => p.fullName === 'Harold Fannin Jr.')!;
    expect(indexW4.byEspnId.has(fannin.espnId)).toBe(false);
    expect(pprFor(indexW4, fannin)).not.toBeNull();
    // Wrong team → no match (name alone is never enough).
    expect(pprFor(indexW4, { fullName: 'Deshaun Watson', team: 'PIT' })).toBeNull();
  });

  it('qb pinned: passer first, then top 3 skill by points', () => {
    const index: PprIndex = {
      byEspnId: new Map([['1', 8], ['2', 20], ['3', 5], ['4', 14], ['5', 11]]),
      byNameTeam: new Map(),
    };
    const summary = {
      headline: null,
      byAbbr: {
        DAL: {
          abbr: 'DAL',
          lines: [
            line('B', { espnId: '2' }),
            line('QB', { espnId: '1', isPasser: true }),
            line('C', { espnId: '3' }),
            line('D', { espnId: '4' }),
            line('E', { espnId: '5' }),
            line('F', { espnId: '6' }),
          ],
        },
      },
    };
    const out = applySleeperPoints(summary, index);
    expect(out.byAbbr.DAL.lines.map((l) => [l.fullName, l.ppr])).toEqual([
      ['QB', 8],
      ['B', 20],
      ['D', 14],
      ['E', 11],
    ]);
    expect(out.headline).toBeNull();
    // Pure: the input is untouched.
    expect(summary.byAbbr.DAL.lines[0].ppr).toBeNull();
    expect(summary.byAbbr.DAL.lines).toHaveLength(6);
  });

  it('no points yet: empty index → all null, skill ordered by scrimmage yards', () => {
    const summary = {
      byAbbr: {
        TB: {
          abbr: 'TB',
          lines: [
            line('QB', { isPasser: true }),
            line('A', { scrimmageYds: 40 }),
            line('B', { scrimmageYds: 120 }),
            line('C', { scrimmageYds: 5 }),
            line('D', { scrimmageYds: 77 }),
          ],
        },
      },
    };
    const out = applySleeperPoints(summary, emptyIndex);
    expect(out.byAbbr.TB.lines.map((l) => l.fullName)).toEqual(['QB', 'B', 'D', 'A']);
    expect(out.byAbbr.TB.lines.every((l) => l.ppr === null)).toBe(true);
  });

  it('no homemade formula: lib/fantasyPoints.ts has no yard/TD scoring weights', () => {
    const src = readFileSync(new URL('../fantasyPoints.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/0\.04|0\.1\b|pass_td|rush_td|rec_td|pass_yd:|rush_yd:|rec_yd:/);
  });
});

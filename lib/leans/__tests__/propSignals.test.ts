/**
 * Prop engine v2 — roles, tables and signals on synthetic weeks, plus the no-look-ahead
 * guarantee: tables (and so every signal) as of week w are identical whether or not
 * games from week w onward exist.
 */
import { describe, expect, it } from 'vitest';
import type { PlayerGameLine } from '@/lib/myteam/types';
import { toPlayerGame } from '../players';
import { computeSignals, defenseVsRoleMock, oppAllowRank, similarDefenseMock, type PropContext } from '../propSignals';
import { buildRoleBook, rolesAsOf } from '../roles';
import { buildPropTables } from '../tables';
import type { TeamGame } from '../types';

type Pos = PlayerGameLine['position'];
const row = (playerId: string, position: Pos, team: string, opponent: string, week: number, s: Record<string, number>): PlayerGameLine => ({
  playerId, position, team, opponent, week, stats: { gp: 1, off_snp: 60, tm_off_snp: 65, ...s },
});

/**
 * Four teams, weeks 1–6, a round robin. Each offense: WR "a" (8 targets), WR "b" (4), RB "r"
 * (15 carries, 3 targets), QB "q" (30 passes, 2 carries). Defense "SOFT" gives RBs double.
 */
const TEAMS = ['AAA', 'BBB', 'CCC', 'SOFT'];
const OPP: Record<number, Record<string, string>> = {
  1: { AAA: 'BBB', BBB: 'AAA', CCC: 'SOFT', SOFT: 'CCC' },
  2: { AAA: 'CCC', CCC: 'AAA', BBB: 'SOFT', SOFT: 'BBB' },
  3: { AAA: 'SOFT', SOFT: 'AAA', BBB: 'CCC', CCC: 'BBB' },
};
const oppOf = (team: string, week: number) => OPP[((week - 1) % 3) + 1][team];

function season(weeks: number, mutateFrom = Infinity): PlayerGameLine[] {
  const out: PlayerGameLine[] = [];
  for (let w = 1; w <= weeks; w++) {
    for (const t of TEAMS) {
      const opp = oppOf(t, w);
      const soft = opp === 'SOFT' ? 2 : 1;
      const wild = w >= mutateFrom ? 10 : 1;
      out.push(
        row(`${t}-a`, 'WR', t, opp, w, { rec_tgt: 8 * wild, rec: 6, rec_yd: 70 + w }),
        row(`${t}-b`, 'WR', t, opp, w, { rec_tgt: 4, rec: 3, rec_yd: 35 }),
        row(`${t}-r`, 'RB', t, opp, w, { rush_att: 15, rush_yd: 60 * soft, rec_tgt: 3, rec: 2 * soft, rec_yd: 15 }),
        row(`${t}-q`, 'QB', t, opp, w, { pass_att: 30, rush_att: 2, rush_yd: 8 }),
      );
    }
  }
  return out;
}

const TEAM_LOG: TeamGame[] = [1, 2, 3, 4, 5, 6].flatMap((w) => TEAMS.map((t) => ({ team: t, opp: oppOf(t, w), week: w, points: 21, pointsAllowed: 21 })));
const candidates = (team: string) => [
  { id: `${team}-a`, position: 'WR' },
  { id: `${team}-b`, position: 'WR' },
  { id: `${team}-r`, position: 'RB' },
];

function ctx(lines: PlayerGameLine[], over: Partial<PropContext> = {}): PropContext {
  const tables = buildPropTables(lines, 4, { candidates });
  const games = lines.filter((l) => l.playerId === 'AAA-r' && l.week < 4).map(toPlayerGame);
  return { playerId: 'AAA-r', position: 'RB', team: 'AAA', opp: 'SOFT', stat: 'rec', line: 2.5, games, tables, teamLog: TEAM_LOG, teamLine: -3, total: 44, rating: null, ...over };
}

describe('roles (role going in, by share)', () => {
  it('WR1 / WR2 by target share, RB1 by touches; week 1 = no roles', () => {
    const book = buildRoleBook(season(6));
    const r = rolesAsOf(book, 'AAA', 4, candidates('AAA'));
    expect(r.get('AAA-a')).toBe('WR1');
    expect(r.get('AAA-b')).toBe('WR2');
    expect(r.get('AAA-r')).toBe('RB1');
    expect(rolesAsOf(book, 'AAA', 1, candidates('AAA')).size).toBe(0);
  });
  it('a non-candidate (inactive) gets no role and the next man moves up', () => {
    const r = rolesAsOf(buildRoleBook(season(6)), 'AAA', 4, candidates('AAA').filter((c) => c.id !== 'AAA-a'));
    expect(r.get('AAA-b')).toBe('WR1');
    expect(r.has('AAA-a')).toBe(false);
  });
});

describe('no look-ahead (tables as of week 4)', () => {
  it('identical with or without games from week 4 on — even wild ones', () => {
    const full = buildPropTables(season(6, 4), 4, { candidates });
    const cut = buildPropTables(season(3), 4, { candidates });
    expect(full).toEqual(cut);
  });
  it('signals identical too, and the prop week never appears in the role log', () => {
    const a = computeSignals(ctx(season(6, 4)));
    const b = computeSignals(ctx(season(3)));
    expect(a).toEqual(b);
    const t = buildPropTables(season(6), 4, { candidates });
    const weeks = Object.values(t.roleLog).flatMap((byRole) => Object.values(byRole).flatMap((cells) => (cells ?? []).map((c) => c.week)));
    expect(Math.max(...weeks)).toBeLessThan(4);
  });
});

describe('signals (+ = over)', () => {
  const lines = season(6);
  const sig = (c: PropContext) => Object.fromEntries(computeSignals(c).map((s) => [s.id, s.x]));

  it('oppAllow: the defense that allows the most RB receptions is the far end (+1)', () => {
    const c = ctx(lines);
    expect(oppAllowRank(c)?.rank).toBe(4);
    expect(sig(c).oppAllow).toBe(1);
    expect(sig(ctx(lines, { opp: 'BBB' })).oppAllow).toBeLessThan(0);
  });
  it('defVsRole: SOFT\'s last games vs RB1s against tonight\'s line (needs roleMinCells)', () => {
    // SOFT faced CCC (w1), BBB (w2), AAA (w3) before week 4 → 3 cells < roleMinCells (4) → sits out.
    expect(defenseVsRoleMock(ctx(lines))).toBeNull();
    expect(sig(ctx(lines)).defVsRole).toBeNull();
    const later = buildPropTables(lines, 6, { candidates });
    const m = defenseVsRoleMock({ tables: later, playerId: 'AAA-r', opp: 'SOFT', stat: 'rec', line: 2.5 });
    expect(m?.role).toBe('RB1');
    // SOFT played weeks 1–5; week 1 has no roles yet → 4 cells.
    expect(m?.cells.map((c) => c.week)).toEqual([2, 3, 4, 5]);
    expect(m?.overs).toBe(4); // every RB1 caught 4 vs SOFT
  });
  it('similarDef: his games vs defenses in tonight’s bucket (4-team toy league: ranks 1–4 are all "stingy")', () => {
    const m = similarDefenseMock(ctx(lines));
    expect(m?.bucket).toBe('stingy');
    expect(m?.games.map((g) => g.opp)).toEqual(['BBB', 'CCC', 'SOFT']);
    expect(m?.overs).toBe(1); // 4 catches vs SOFT only
  });
  it('hits + median: a 2-catch back vs a 2.5 line leans under; vs 1.5 over', () => {
    const under = sig(ctx(lines, { opp: 'BBB' }));
    expect(under.seasonHit).toBeLessThan(0);
    const over = sig(ctx(lines, { opp: 'BBB', line: 1.5 }));
    expect(over.medianEdge).toBeGreaterThan(0);
  });
  it('spreadScript: rushing likes being favored, receiving likes getting points', () => {
    expect(sig(ctx(lines, { stat: 'rush_yd', teamLine: -6 })).spreadScript).toBe(6);
    expect(sig(ctx(lines, { stat: 'rec', teamLine: -6 })).spreadScript).toBe(-6);
    expect(sig(ctx(lines, { teamLine: null })).spreadScript).toBeNull();
  });
  it('impliedTotal: 44 total, favored by 3 → 23.5 implied vs a 21-ppg team = +2.5', () => {
    expect(sig(ctx(lines)).impliedTotal).toBeCloseTo(2.5, 6);
    expect(sig(ctx(lines, { total: null })).impliedTotal).toBeNull();
  });
  it('projEdge: a projection exists with volume data; no games → null', () => {
    expect(sig(ctx(lines)).projEdge).not.toBeNull();
    expect(sig(ctx(lines, { games: [] })).projEdge).toBeNull();
  });
});

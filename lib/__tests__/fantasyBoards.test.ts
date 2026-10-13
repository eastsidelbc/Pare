/**
 * Leaders → Fantasy boards with a mocked Sleeper: skill rows rank by Pare points
 * (pts_ppr + 3 per yardage-bonus flag), D/ST stays plain pts_ppr.
 */
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: <F,>(fn: F) => fn }));
vi.mock('../schedule', () => ({ getCurrentWeekInfo: async () => ({ season: 2026, week: 6 }) }));

const PLAYERS = {
  '3294': { full_name: 'Dak Prescott', position: 'QB', team: 'DAL', espn_id: 2577417 },
  '9001': { full_name: 'Plain Passer', position: 'QB', team: 'NYG', espn_id: null },
};
const SEASON_STATS = {
  // Dak 2026 through W5: 96.84 pts_ppr + two 300–399 yd games → 102.84.
  '3294': { pts_ppr: 96.84, gp: 5, bonus_pass_yd_300: 2, bonus_pass_cmp_25: 3, bonus_fd_qb: 66 },
  // More pts_ppr than Dak but no bonuses → ranks below him.
  '9001': { pts_ppr: 100, gp: 5 },
  DAL: { pts_ppr: 40, gp: 5 },
};

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getFantasyBoards', () => {
  it('leaders pare points: season rows rank by pts_ppr + 3 per bonus flag', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => json(String(input).includes('/players/nfl') ? PLAYERS : SEASON_STATS)),
    );
    vi.resetModules();
    const { getFantasyBoards, getPlayerMap } = await import('../fantasy');

    const boards = await getFantasyBoards();
    const qb = boards.find((b) => b.key === 'fantasyQB')!;
    expect(qb.leaders.map((r) => [r.name, r.value, r.displayValue])).toEqual([
      ['Dak Prescott', 102.84, '102.8'],
      ['Plain Passer', 100, '100.0'],
    ]);
    const dst = boards.find((b) => b.key === 'fantasyDST')!;
    expect(dst.leaders[0].value).toBe(40);

    // Player map v5 keeps the ESPN id for every player (not only rookies).
    const map = await getPlayerMap();
    expect(map['3294'].espnId).toBe('2577417');
    expect(map['3294'].rookieEspnId).toBeUndefined();
    expect(map['9001'].espnId).toBeUndefined();
  });
});

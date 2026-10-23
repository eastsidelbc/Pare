import { describe, expect, it } from 'vitest';
import { agoText, buildLeagueMoves, type TransactionRaw } from '@/lib/myteam/leagueMoves';

const rosters = [{ roster_id: 1, owner_id: 'u1' }, { roster_id: 2, owner_id: 'u2' }, { roster_id: 3, owner_id: null }];
const users = [{ user_id: 'u1', display_name: 'kobe', metadata: { team_name: 'Gold Rush' } }, { user_id: 'u2', display_name: 'sam', metadata: {} }];
const names: Record<string, string> = { p1: 'Rico Dawson', p2: 'Tate Morrow', p3: 'Wes Kimura', p4: 'Al Reed' };
const name = (id: string) => names[id] ?? null;

const txs: TransactionRaw[] = [
  { transaction_id: 't1', type: 'free_agent', status: 'complete', created: 1000, adds: { p1: 1 }, drops: { p2: 1 }, roster_ids: [1] },
  { transaction_id: 't2', type: 'trade', status: 'complete', created: 3000, adds: { p3: 2, p4: 1 }, drops: { p3: 1, p4: 2 }, roster_ids: [1, 2] },
  { transaction_id: 't3', type: 'waiver', status: 'failed', created: 5000, adds: { p2: 2 }, roster_ids: [2] },
  { transaction_id: 't4', type: 'commissioner', status: 'complete', created: 6000, adds: { p2: 3 }, roster_ids: [3] },
];

describe('buildLeagueMoves', () => {
  const moves = buildLeagueMoves(txs, rosters, users, name, 1);
  it('complete adds / drops / trades only, newest first', () => {
    expect(moves.map((m) => m.id)).toEqual(['t2', 't1']);
  });
  it('trade: one side per team, team name over display name, mine flagged', () => {
    expect(moves[0].sides).toEqual([
      { team: 'Gold Rush', mine: true, adds: ['Al Reed'], drops: ['Wes Kimura'] },
      { team: 'sam', mine: false, adds: ['Wes Kimura'], drops: ['Al Reed'] },
    ]);
  });
  it('free agent: add + drop', () => {
    expect(moves[1]).toMatchObject({ kind: 'free_agent', sides: [{ team: 'Gold Rush', adds: ['Rico Dawson'], drops: ['Tate Morrow'] }] });
  });
});

describe('agoText', () => {
  it('minutes, hours, days', () => {
    expect(agoText(0, 5 * 60_000)).toBe('5m ago');
    expect(agoText(0, 3 * 3_600_000)).toBe('3h ago');
    expect(agoText(0, 72 * 3_600_000)).toBe('3d ago');
  });
});

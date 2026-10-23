import { describe, expect, it } from 'vitest';
import { addsText, pickAvailable, startablePositions } from '@/lib/myteam/waiver';

const players = {
  '1': { name: 'Owned RB', position: 'RB', team: 'DAL' },
  '2': { name: 'Free WR', position: 'WR', team: 'KC' },
  '3': { name: 'Free K', position: 'K', team: 'BUF' },
  '4': { name: 'Free LB', position: 'LB', team: 'NYJ' },
  '5': { name: 'Free QB', position: 'QB', team: null },
};
const trending = [{ player_id: '1', count: 900_000 }, { player_id: '2', count: 450_000 }, { player_id: '3', count: 20_000 }, { player_id: '4', count: 9_000 }, { player_id: '5', count: 950 }, { player_id: '6', count: 10 }];

describe('pickAvailable', () => {
  it('skips owned players, positions the league can\'t start, IDP and unknown ids; keeps trending order', () => {
    const got = pickAvailable(trending, new Set(['1']), players, startablePositions(['QB', 'RB', 'WR', 'TE', 'FLEX', 'DEF']));
    expect(got.map((p) => p.name)).toEqual(['Free WR', 'Free QB']);
    expect(got[1]).toMatchObject({ team: null, adds: 950 });
  });
  it('caps at the shown count', () => {
    expect(pickAvailable(trending, new Set(), players, startablePositions(['SUPER_FLEX', 'K']), 2)).toHaveLength(2);
  });
});

describe('startablePositions + addsText', () => {
  it('FLEX → RB/WR/TE, SUPER_FLEX adds QB', () => {
    expect([...startablePositions(['FLEX'])].sort()).toEqual(['RB', 'TE', 'WR']);
    expect(startablePositions(['SUPER_FLEX']).has('QB')).toBe(true);
  });
  it('compact counts', () => {
    expect(addsText(876_294)).toBe('876K');
    expect(addsText(12_400)).toBe('12.4K');
    expect(addsText(940)).toBe('940');
  });
});

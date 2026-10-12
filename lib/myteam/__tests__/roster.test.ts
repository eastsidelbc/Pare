import { describe, it, expect } from 'vitest';
import { findMyRoster, normalizeRoster, starterSlots, toInjuryTag, type SleeperPlayerInfo, type SleeperRoster } from '../sleeper/roster';
import { loadFixture } from './fixtures';

describe('synthetic co-owner fixture', () => {
  const rosters = loadFixture<SleeperRoster[]>('synthetic/rosters-co-owner.json');

  it('finds a roster where the user is ONLY in co_owners', () => {
    expect(findMyRoster(rosters, '900000000000000003')?.roster_id).toBe(2);
    expect(findMyRoster(rosters, '900000000000000004')?.roster_id).toBe(2);
  });
  it('returns null when the user is on no roster (or rosters are missing)', () => {
    expect(findMyRoster(rosters, '900000000000000099')).toBeNull();
    expect(findMyRoster(null, '900000000000000003')).toBeNull();
  });
  it('prefers a roster the user owns over one they co-own', () => {
    const mixed = [
      { owner_id: '7', co_owners: ['1'] },
      { owner_id: '1', co_owners: null },
    ];
    expect(findMyRoster(mixed, '1')).toBe(mixed[1]);
  });
  it('a co-owned roster normalizes like any other (reserve → IR)', () => {
    const r = normalizeRoster(rosters[1], ['QB', 'RB', 'BN'], {}, 'in_season');
    expect(r.preDraft).toBe(false);
    expect(r.players.map((p) => [p.playerId, p.group])).toEqual([
      ['8130', 'starter'], ['9509', 'starter'], ['7564', 'ir'], ['KC', 'bench'],
    ]);
  });
});

describe('synthetic pre_draft fixture', () => {
  const league = loadFixture<{ status: string; roster_positions: string[] }>('synthetic/league-pre-draft.json');
  const rosters = loadFixture<SleeperRoster[]>('synthetic/rosters-pre-draft.json');

  it('players: null → empty groups + pre-draft flag, no throw', () => {
    for (const roster of rosters) {
      expect(() => normalizeRoster(roster, league.roster_positions, {}, league.status)).not.toThrow();
      expect(normalizeRoster(roster, league.roster_positions, {}, league.status)).toEqual({ rosterId: roster.roster_id, players: [], preDraft: true });
    }
  });
  it('players: null is treated as pre-draft even if the status says otherwise', () => {
    expect(normalizeRoster(rosters[0], league.roster_positions, {}, 'in_season').preDraft).toBe(true);
  });
  it('still finds my (empty) roster before the draft', () => {
    expect(findMyRoster(rosters, '900000000000000001')?.roster_id).toBe(1);
  });
});

describe('real (anonymized) P0a fixture', () => {
  const user = loadFixture<{ user_id: string }>('sleeper-user.json');
  const league = loadFixture<{ status: string; roster_positions: string[] }>('sleeper-league.json');
  const rosters = loadFixture<SleeperRoster[]>('sleeper-rosters.json');
  const players = loadFixture<Record<string, SleeperPlayerInfo>>('sleeper-players-slim.json');
  const mine = findMyRoster(rosters, user.user_id);

  it('finds my roster via owner_id', () => {
    expect(mine?.owner_id).toBe(user.user_id);
  });
  it('groups starters (with slots) and bench without duplicates', () => {
    if (!mine) throw new Error('fixture roster missing');
    const r = normalizeRoster(mine, league.roster_positions, players, league.status);
    const slots = starterSlots(league.roster_positions);
    const starters = r.players.filter((p) => p.group === 'starter');
    expect(starters.map((p) => p.slot)).toEqual(slots.slice(0, starters.length));
    expect(starters.length).toBe((mine.starters ?? []).filter((id) => id !== '0').length);
    expect(r.players.length).toBe(new Set(mine.players).size);
    expect(new Set(r.players.map((p) => p.playerId)).size).toBe(r.players.length);
    expect(r.players.every((p) => p.name.length > 0)).toBe(true);
  });
});

describe('toInjuryTag', () => {
  it('maps Sleeper statuses to Q/D/O/IR; others show no tag', () => {
    expect(['Questionable', 'Doubtful', 'Out', 'IR', 'PUP', 'Sus', null].map(toInjuryTag)).toEqual(['Q', 'D', 'O', 'IR', null, null, null]);
  });
});

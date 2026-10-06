import { describe, it, expect } from 'vitest';
import { MAX_FAVORITES, moveTeam, sanitizeTeams, toggleTeam } from '../store';

describe('toggleTeam', () => {
  it('adds a new team at the end', () => {
    expect(toggleTeam(['MIN'], 'KC')).toEqual({ teams: ['MIN', 'KC'], result: 'added' });
  });
  it('removes an existing team', () => {
    expect(toggleTeam(['MIN', 'KC'], 'MIN')).toEqual({ teams: ['KC'], result: 'removed' });
  });
  it('refuses past the cap and leaves the list alone', () => {
    const full = ['MIN', 'KC', 'PHI'];
    expect(full.length).toBe(MAX_FAVORITES);
    const r = toggleTeam(full, 'BUF');
    expect(r.result).toBe('full');
    expect(r.teams).toBe(full);
  });
  it('still allows removing when full', () => {
    expect(toggleTeam(['MIN', 'KC', 'PHI'], 'KC').teams).toEqual(['MIN', 'PHI']);
  });
});

describe('moveTeam', () => {
  it('swaps with the neighbor', () => {
    expect(moveTeam(['MIN', 'KC', 'PHI'], 'KC', -1)).toEqual(['KC', 'MIN', 'PHI']);
    expect(moveTeam(['MIN', 'KC', 'PHI'], 'KC', 1)).toEqual(['MIN', 'PHI', 'KC']);
  });
  it('ignores moves past either end or unknown teams', () => {
    const t = ['MIN', 'KC'];
    expect(moveTeam(t, 'MIN', -1)).toBe(t);
    expect(moveTeam(t, 'KC', 1)).toBe(t);
    expect(moveTeam(t, 'BUF', 1)).toBe(t);
  });
});

describe('sanitizeTeams', () => {
  it('drops unknown, duplicate and non-string entries and caps the list', () => {
    expect(sanitizeTeams(['MIN', 'XXX', 'MIN', 7, 'KC', 'PHI', 'BUF'])).toEqual(['MIN', 'KC', 'PHI']);
  });
  it('returns [] for garbage', () => {
    expect(sanitizeTeams(null)).toEqual([]);
    expect(sanitizeTeams('MIN')).toEqual([]);
  });
});

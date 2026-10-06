import { describe, expect, it } from 'vitest';
import { isRookieRow, normalizePlayerName, rookieKey, type RookieIndex } from '../rookieMatch';

describe('normalizePlayerName', () => {
  it('drops suffixes, punctuation and accents', () => {
    expect(normalizePlayerName('Kenneth Walker III')).toBe('kenneth walker');
    expect(normalizePlayerName('Amon-Ra St. Brown')).toBe('amon ra st brown');
    expect(normalizePlayerName("D'Andre Swift Jr.")).toBe('dandre swift');
    expect(normalizePlayerName('José Ramírez')).toBe('jose ramirez');
  });

  it('keeps a lone word even if it looks like a suffix', () => {
    expect(normalizePlayerName('V')).toBe('v');
  });
});

describe('isRookieRow', () => {
  const index: RookieIndex = {
    espnIds: new Set(['999']),
    nameTeam: new Set([rookieKey('Adam Randall', 'BAL'), rookieKey('Behren Morton', 'NE')]),
  };

  it('matches on ESPN id first', () => {
    expect(isRookieRow(index, { athleteId: '999', name: 'Anyone', teamAbbr: 'KC' })).toBe(true);
  });

  it('matches on name + team when the id is missing', () => {
    expect(isRookieRow(index, { athleteId: '1', name: 'Adam Randall', teamAbbr: 'BAL' })).toBe(true);
    expect(isRookieRow(index, { athleteId: '2', name: 'Behren Morton Jr.', teamAbbr: 'ne' })).toBe(true);
  });

  it('does not match a same-named player on another team', () => {
    expect(isRookieRow(index, { athleteId: '3', name: 'Adam Randall', teamAbbr: 'DAL' })).toBe(false);
  });
});

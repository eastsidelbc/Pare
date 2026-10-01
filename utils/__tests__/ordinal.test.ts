import { describe, it, expect } from 'vitest';
import { ordinalSuffix, formatRank } from '../ordinal';

describe('ordinalSuffix', () => {
  it('handles 1st / 2nd / 3rd', () => {
    expect(ordinalSuffix(1)).toBe('st');
    expect(ordinalSuffix(2)).toBe('nd');
    expect(ordinalSuffix(3)).toBe('rd');
  });

  it('handles the 11–13 "teens" exception', () => {
    expect(ordinalSuffix(11)).toBe('th');
    expect(ordinalSuffix(12)).toBe('th');
    expect(ordinalSuffix(13)).toBe('th');
  });

  it('handles 21 / 22 / 23 / 31 (the old "21th/31th" bug)', () => {
    expect(ordinalSuffix(21)).toBe('st');
    expect(ordinalSuffix(22)).toBe('nd');
    expect(ordinalSuffix(23)).toBe('rd');
    expect(ordinalSuffix(31)).toBe('st');
    expect(ordinalSuffix(32)).toBe('nd');
  });
});

describe('formatRank', () => {
  it('formats rank with its ordinal', () => {
    expect(formatRank(1)).toBe('1st');
    expect(formatRank(4)).toBe('4th');
    expect(formatRank(21)).toBe('21st');
    expect(formatRank(31)).toBe('31st');
  });

  it('adds the tie prefix when tied', () => {
    expect(formatRank(12, true)).toBe('T-12th');
    expect(formatRank(21, true)).toBe('T-21st');
  });
});

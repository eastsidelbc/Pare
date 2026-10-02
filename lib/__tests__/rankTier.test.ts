import { describe, it, expect } from 'vitest';
import { getRankTier } from '@/lib/rankTier';

describe('getRankTier', () => {
  it('maps the 32-team tiers', () => {
    expect(getRankTier(1)).toBe('first');
    expect(getRankTier(2)).toBe('top');
    expect(getRankTier(5)).toBe('top');
    expect(getRankTier(6)).toBe('mid');
    expect(getRankTier(27)).toBe('mid');
    expect(getRankTier(28)).toBe('low');
    expect(getRankTier(31)).toBe('low');
    expect(getRankTier(32)).toBe('last');
  });
  it('handles unranked values', () => {
    expect(getRankTier(null)).toBe('none');
    expect(getRankTier(undefined)).toBe('none');
    expect(getRankTier(Number.NaN)).toBe('none');
    expect(getRankTier(0)).toBe('none');
  });
  it('respects a smaller field (e.g. with special teams excluded)', () => {
    expect(getRankTier(30, 30)).toBe('last');
    expect(getRankTier(26, 30)).toBe('low');
  });
});

import { describe, it, expect } from 'vitest';
import { wordmarkSize } from '@/components/compare/MatchupHero';

describe('wordmarkSize', () => {
  it('shrinks long and wide nicknames', () => {
    expect(wordmarkSize('BILLS', 'lg')).toBe(32);
    expect(wordmarkSize('CHARGERS', 'lg')).toBe(27);
    expect(wordmarkSize('SEAHAWKS', 'lg')).toBe(24); // W counts wide
    expect(wordmarkSize('COMMANDERS', 'lg')).toBe(20);
    expect(wordmarkSize('BILLS', 'sm')).toBeLessThan(wordmarkSize('BILLS', 'lg'));
  });
});

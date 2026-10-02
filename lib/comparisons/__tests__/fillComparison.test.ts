import { describe, it, expect } from 'vitest';
import { findPairDuplicate } from '@/lib/comparisons/useFillComparison';

const tabs = [
  { id: 'a', teamA: 'Indianapolis Colts', teamB: 'Washington Commanders' },
  { id: 'blank', teamA: '', teamB: '' },
];

describe('findPairDuplicate', () => {
  it('finds an open tab with the same pair in either orientation', () => {
    expect(findPairDuplicate(tabs, 'blank', 'Indianapolis Colts', 'Washington Commanders')?.id).toBe('a');
    expect(findPairDuplicate(tabs, 'blank', 'Washington Commanders', 'Indianapolis Colts')?.id).toBe('a');
  });
  it('ignores the blank tab itself and unrelated pairs', () => {
    expect(findPairDuplicate(tabs, 'blank', 'New England Patriots', 'Buffalo Bills')).toBeUndefined();
    expect(findPairDuplicate([{ id: 'blank', teamA: 'X', teamB: 'Y' }], 'blank', 'X', 'Y')).toBeUndefined();
  });
});

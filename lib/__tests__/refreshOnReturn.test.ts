import { describe, it, expect } from 'vitest';
import { isDataStale } from '@/lib/hooks/useRefreshOnReturn';

const MIN = 60_000;

describe('isDataStale (refresh-on-return rule)', () => {
  it('does not refresh a quick app switch (< 60s)', () => {
    expect(isDataStale(0, 59_999, MIN)).toBe(false);
  });
  it('refreshes once the data is 60s+ old', () => {
    expect(isDataStale(0, MIN, MIN)).toBe(true);
    expect(isDataStale(0, 3 * 60 * MIN, MIN)).toBe(true);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTtlCache, liveWithLastGood } from '@/lib/apiCache';

const empty = () => 'EMPTY';
const ok = (v: string) => () => Promise.resolve(v);
const fail = (msg: string) => () => Promise.reject(new Error(msg));

describe('liveWithLastGood', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns fresh data and remembers it', async () => {
    const cache = createTtlCache<string>(0);
    expect(await liveWithLastGood(cache, ok('week4'), empty, 't')).toBe('week4');
    expect(cache.getStale()).toBe('week4');
  });

  it('always calls the source (never serves the backup as "fresh")', async () => {
    const cache = createTtlCache<string>(0);
    const fetcher = vi.fn(ok('a'));
    await liveWithLastGood(cache, fetcher, empty, 't');
    await liveWithLastGood(cache, fetcher, empty, 't');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('serves the last good copy when the source fails (HTTP error / timeout / partial)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const cache = createTtlCache<string>(0);
    await liveWithLastGood(cache, ok('good'), empty, 't');
    expect(await liveWithLastGood(cache, fail('ESPN standings HTTP 503'), empty, 't')).toBe('good');
    expect(await liveWithLastGood(cache, fail('The operation was aborted due to timeout'), empty, 't')).toBe('good');
    expect(await liveWithLastGood(cache, fail('ESPN standings mapped 20/32 teams'), empty, 't')).toBe('good');
  });

  it('serves empty only when there has never been good data', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const cache = createTtlCache<string>(0);
    expect(await liveWithLastGood(cache, fail('down'), empty, 't')).toBe('EMPTY');
  });

  it('recovers: the next good fetch replaces the backup', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const cache = createTtlCache<string>(0);
    await liveWithLastGood(cache, ok('old'), empty, 't');
    await liveWithLastGood(cache, fail('down'), empty, 't');
    expect(await liveWithLastGood(cache, ok('new'), empty, 't')).toBe('new');
    expect(cache.getStale()).toBe('new');
  });
});

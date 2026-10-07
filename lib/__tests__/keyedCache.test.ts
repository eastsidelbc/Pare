import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createKeyedCache } from '../apiCache';

let clock = 0;
const now = () => clock;

beforeEach(() => {
  clock = 1_000;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('createKeyedCache', () => {
  it('serves a fresh hit without calling the fetcher again', async () => {
    const cache = createKeyedCache<string>({ ttlMs: 100, max: 10, now });
    const fetcher = vi.fn(async () => 'v1');
    expect(await cache.get('a', fetcher)).toBe('v1');
    clock += 99;
    expect(await cache.get('a', fetcher)).toBe('v1');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches once the TTL has passed', async () => {
    const cache = createKeyedCache<number>({ ttlMs: 100, max: 10, now });
    let n = 0;
    const fetcher = async () => ++n;
    await cache.get('a', fetcher);
    clock += 100;
    expect(await cache.get('a', fetcher)).toBe(2);
  });

  it('dedupes concurrent calls for the same key (one in-flight fetch)', async () => {
    const cache = createKeyedCache<string>({ ttlMs: 100, max: 10, now });
    let resolve: (v: string) => void = () => {};
    const fetcher = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    const p1 = cache.get('a', fetcher);
    const p2 = cache.get('a', fetcher);
    resolve('v');
    expect(await Promise.all([p1, p2])).toEqual(['v', 'v']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves the last good copy when a refresh fails; rethrows when there is none', async () => {
    const cache = createKeyedCache<string>({ ttlMs: 100, max: 10, now });
    await cache.get('a', async () => 'good');
    clock += 500;
    expect(await cache.get('a', async () => { throw new Error('ESPN down'); })).toBe('good');
    await expect(cache.get('b', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
  });

  it('caches null values (e.g. "user not found") like any other value', async () => {
    const cache = createKeyedCache<string | null>({ ttlMs: 100, max: 10, now });
    const fetcher = vi.fn(async () => null);
    expect(await cache.get('ghost', fetcher)).toBeNull();
    expect(await cache.get('ghost', fetcher)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('evicts the least-recently-used key past `max`', async () => {
    const cache = createKeyedCache<string>({ ttlMs: 1_000, max: 2, now });
    const f = (v: string) => vi.fn(async () => v);
    await cache.get('a', f('a'));
    await cache.get('b', f('b'));
    await cache.get('a', f('a2')); // touch a → b is now oldest
    await cache.get('c', f('c')); // evicts b
    expect(cache.size()).toBe(2);
    const refetchB = f('b2');
    expect(await cache.get('b', refetchB)).toBe('b2');
    expect(refetchB).toHaveBeenCalledTimes(1);
    const keepA = f('never');
    // a was evicted by b's refetch (max 2: c, b) — prove LRU order, not just size.
    expect(await cache.get('c', keepA)).toBe('c');
    expect(keepA).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLiveCache, createCallBudget, LiveBudgetError, type LiveCacheStatus } from '@/lib/apiCache';

/** Injected clock. */
function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, set: (v: number) => (t = v), advance: (ms: number) => (t += ms) };
}

const fixedTtl = (ms: number) => () => ms;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('createLiveCache', () => {
  it('50 concurrent gets → one upstream call, 1 MISS + 49 HIT', async () => {
    const c = clock();
    const cache = createLiveCache<number>({ label: 't', max: 10, retainMs: 60_000, ttlFor: fixedTtl(15_000), now: c.now });
    const fetcher = vi.fn(async () => 7);
    const results = await Promise.all(Array.from({ length: 50 }, () => cache.get('k', fetcher)));
    expect(fetcher).toHaveBeenCalledTimes(1);
    const count = (s: LiveCacheStatus) => results.filter((r) => r.status === s).length;
    expect(count('MISS')).toBe(1);
    expect(count('HIT')).toBe(49);
    expect(results.every((r) => r.value === 7)).toBe(true);
  });

  it('TTL hit: inside the TTL → no call; after it → one call', async () => {
    const c = clock();
    const cache = createLiveCache<number>({ label: 't', max: 10, retainMs: 60_000, ttlFor: fixedTtl(15_000), now: c.now });
    const fetcher = vi.fn(async () => 1);
    await cache.get('k', fetcher);
    c.advance(14_999);
    const hit = await cache.get('k', fetcher);
    expect(hit.status).toBe('HIT');
    expect(hit.freshForMs).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    c.advance(1);
    const miss = await cache.get('k', fetcher);
    expect(miss.status).toBe('MISS');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('ttlFor per value: 15s vs 300s from the value, given the store-time clock', async () => {
    const c = clock();
    const seen: number[] = [];
    const ttlFor = (v: { live: boolean }, now: number) => {
      seen.push(now);
      return v.live ? 15_000 : 300_000;
    };
    const cache = createLiveCache<{ live: boolean }>({ label: 't', max: 10, retainMs: 3_600_000, ttlFor, now: c.now });
    let releaseLive: () => void = () => {};
    const livePromise = cache.get('live', () => new Promise((r) => (releaseLive = () => r({ live: true }))));
    c.advance(500); // the value is stored at this (later) time
    releaseLive();
    const live = await livePromise;
    expect(seen).toEqual([c.now()]);
    expect(live.updatedAt).toBe(c.now());
    expect(live.freshForMs).toBe(15_000);
    const idle = await cache.get('idle', async () => ({ live: false }));
    expect(idle.freshForMs).toBe(300_000);

    const fetcher = vi.fn(async () => ({ live: false }));
    c.advance(20_000);
    expect((await cache.get('live', fetcher)).status).toBe('MISS'); // 15s TTL expired
    expect((await cache.get('idle', fetcher)).status).toBe('HIT'); // 300s TTL still fresh
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('stale on failure: fetcher rejects → last-good with status STALE', async () => {
    const c = clock();
    const cache = createLiveCache<number>({ label: 't', max: 10, retainMs: 60_000, ttlFor: fixedTtl(15_000), now: c.now });
    await cache.get('k', async () => 42);
    c.advance(15_000);
    const res = await cache.get('k', async () => {
      throw new Error('ESPN HTTP 500');
    });
    expect(res).toMatchObject({ value: 42, status: 'STALE', freshForMs: 0 });
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('rejects with no last-good', async () => {
    const cache = createLiveCache<number>({ label: 't', max: 10, retainMs: 60_000, ttlFor: fixedTtl(15_000) });
    await expect(
      cache.get('k', async () => {
        throw new Error('ESPN HTTP 403');
      }),
    ).rejects.toThrow('ESPN HTTP 403');
  });

  it('backoff: 5s → 10s → … capped at 120s, reset by a success', async () => {
    const c = clock();
    const cache = createLiveCache<number>({ label: 't', max: 10, retainMs: 3_600_000, ttlFor: fixedTtl(15_000), now: c.now });
    let fail = true;
    const fetcher = vi.fn(async () => {
      if (fail) throw new Error('down');
      return 1;
    });
    const tryGet = () => cache.get('k', fetcher).catch(() => null);

    await tryGet(); // failure #1 → wait 5s
    expect(fetcher).toHaveBeenCalledTimes(1);
    const waits = [5_000, 10_000, 20_000, 40_000, 80_000, 120_000, 120_000];
    for (const [i, wait] of waits.entries()) {
      c.advance(wait - 1);
      await tryGet();
      expect(fetcher).toHaveBeenCalledTimes(i + 1); // still waiting: no upstream call
      c.advance(1);
      await tryGet();
      expect(fetcher).toHaveBeenCalledTimes(i + 2); // retry at exactly the backoff
    }

    // A success resets it: the next failure waits 5s again.
    c.advance(120_000);
    fail = false;
    expect((await cache.get('k', fetcher)).status).toBe('MISS');
    fail = true;
    c.advance(15_000);
    await expect(cache.get('k', fetcher)).resolves.toMatchObject({ status: 'STALE' });
    const calls = fetcher.mock.calls.length;
    c.advance(4_999);
    expect((await cache.get('k', fetcher)).status).toBe('STALE');
    expect(fetcher).toHaveBeenCalledTimes(calls);
    c.advance(1);
    await cache.get('k', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(calls + 1);
  });

  it('budget exhausted: STALE without calling, else rejects LiveBudgetError, never throws synchronously', async () => {
    const c = clock();
    const budget = createCallBudget({ limit: 1, windowMs: 60_000, now: c.now });
    const cache = createLiveCache<number>({ label: 't', max: 10, retainMs: 60_000, ttlFor: fixedTtl(15_000), budgets: [budget], now: c.now });
    const fetcher = vi.fn(async () => 5);
    await cache.get('a', fetcher); // takes the only call
    c.advance(15_000);

    const staleRes = await cache.get('a', fetcher);
    expect(staleRes).toMatchObject({ value: 5, status: 'STALE' });
    expect(fetcher).toHaveBeenCalledTimes(1);

    let promise: Promise<unknown> | undefined;
    expect(() => {
      promise = cache.get('b', fetcher);
    }).not.toThrow();
    await expect(promise).rejects.toBeInstanceOf(LiveBudgetError);
    await expect(promise).rejects.toHaveProperty('name', 'LiveBudgetError');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('a spent second budget blocks the call even when the first has room', async () => {
    const global = createCallBudget({ limit: 100, windowMs: 60_000 });
    const narrow = createCallBudget({ limit: 0, windowMs: 60_000 });
    const cache = createLiveCache<number>({ label: 't', max: 10, retainMs: 60_000, ttlFor: fixedTtl(15_000), budgets: [global, narrow] });
    await expect(cache.get('x', async () => 1)).rejects.toBeInstanceOf(LiveBudgetError);
    expect(global.remaining()).toBe(100); // nothing taken when any budget is spent
  });

  it('bounded: max + 5 keys stay ≤ max; retainMs sweep drops old keys', async () => {
    const c = clock();
    const cache = createLiveCache<number>({ label: 't', max: 10, retainMs: 3_600_000, ttlFor: fixedTtl(15_000), now: c.now });
    for (let i = 0; i < 15; i += 1) await cache.get(`k${i}`, async () => i);
    expect(cache.size()).toBeLessThanOrEqual(10);

    c.advance(3_600_001);
    await cache.get('fresh', async () => 1); // lazy sweep runs inside get (≥60s since the last one)
    expect(cache.size()).toBe(1);
  });

  it('no timers: creating + reading the cache schedules nothing', async () => {
    vi.useFakeTimers();
    const cache = createLiveCache<number>({ label: 't', max: 10, retainMs: 60_000, ttlFor: fixedTtl(15_000) });
    await cache.get('k', async () => 1);
    await cache.get('k', async () => 2);
    expect(vi.getTimerCount()).toBe(0);
  });
});

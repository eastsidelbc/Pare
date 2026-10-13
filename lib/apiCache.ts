/**
 * Tiny in-memory TTL cache for API route handlers.
 *
 * Each API route (offense, defense, …) kept its own identical copy of this
 * logic: a `CacheEntry` interface, a module-level `let cache`, and the same
 * "is it fresh?" math inline. That was duplicated boilerplate and drifted easily.
 *
 * `createTtlCache` centralizes it behind three methods:
 *   - getFresh() → the value only if it's still within maxAge (with its age)
 *   - getStale() → the last value regardless of age (for failure fallbacks)
 *   - set()      → store a new value and stamp "now"
 *
 * The cache lives for the lifetime of the server process (module singleton),
 * exactly like the old `let cache` did — so route behavior is unchanged.
 */

export interface TtlCache<T> {
  /** Returns the cached value + its age ONLY if still fresh; otherwise null. */
  getFresh(): { value: T; ageMs: number } | null;
  /** Returns the last cached value regardless of age (null if never set). */
  getStale(): T | null;
  /** Stores a new value and resets the freshness clock to now. */
  set(value: T): void;
}

/**
 * Create a TTL cache that holds a single value of type T.
 * @param maxAgeMs how long a value is considered "fresh", in milliseconds.
 */
export function createTtlCache<T>(maxAgeMs: number): TtlCache<T> {
  let value: T | null = null;
  let timestamp = 0;

  return {
    getFresh() {
      if (value === null || timestamp === 0) return null;
      const ageMs = Date.now() - timestamp;
      return ageMs < maxAgeMs ? { value, ageMs } : null;
    },
    getStale() {
      return value;
    },
    set(next: T) {
      value = next;
      timestamp = Date.now();
    },
  };
}

/**
 * Live-first with a last-good fallback (the "backup only" pattern, as a helper).
 *
 * Always calls `fetcher` fresh. Success → remember it in `cache` and return it.
 * Failure (HTTP error, timeout, bad payload) → return the last good copy, or
 * `empty()` only if there has never been one since the server started.
 * Pair it with `createTtlCache(0)` so the copy is never served as "fresh".
 */
export async function liveWithLastGood<T>(
  cache: TtlCache<T>,
  fetcher: () => Promise<T>,
  empty: () => T,
  label: string,
): Promise<T> {
  try {
    const value = await fetcher();
    cache.set(value);
    return value;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const stale = cache.getStale();
    if (stale !== null) {
      console.error(`⚠️ [${label}] fetch failed (${reason}) — serving last good copy`);
      return stale;
    }
    console.error(`❌ [${label}] fetch failed (${reason}) — no good copy yet, serving empty`);
    return empty();
  }
}

// ──────────────────────────────────────────────────────────────────────────
//  Keyed cache + call budget (My Team: per-user / per-league Sleeper data)
// ──────────────────────────────────────────────────────────────────────────

export interface KeyedCacheOptions {
  /** How long a value is fresh. */
  ttlMs: number;
  /** Max keys kept; least-recently-used keys are evicted past this. */
  max: number;
  /** Clock (tests). */
  now?: () => number;
}

export interface KeyedCache<T> {
  /**
   * Fresh hit → cached value. Otherwise run `fetcher` (one in-flight call per
   * key). Success → stored. Failure → the key's last good (stale) value if
   * there is one, else the error is rethrown.
   */
  get(key: string, fetcher: () => Promise<T>, label?: string): Promise<T>;
  /** Number of keys held (fresh or stale). */
  size(): number;
  /** Delete entries past their max age (runs on its own; exposed for tests). No entry outlives 2 × ttlMs. */
  sweep(): void;
}

/** Longest gap between sweeps; caches with a TTL under 20 min sweep every ttlMs / 2. */
export const KEYED_CACHE_SWEEP_MS = 10 * 60 * 1000;

/**
 * Bounded in-memory LRU with per-key last-good + in-flight dedupe. Memory only
 * (never `unstable_cache`), so per-user data like usernames is never written
 * to disk. Lives for the server process, like createTtlCache.
 *
 * Retention: a sweep every `sweepEvery` (min(KEYED_CACHE_SWEEP_MS, ttlMs / 2))
 * deletes entries older than 2 × ttlMs − sweepEvery, so no entry ever outlives
 * 2 × ttlMs (exactly 48h for the 24h username lookup — /privacy promises this),
 * while last-good still survives to at least 1.5 × ttlMs. The timer is
 * unref'd: it never keeps the process alive.
 */
export function createKeyedCache<T>({ ttlMs, max, now = Date.now }: KeyedCacheOptions): KeyedCache<T> {
  const entries = new Map<string, { value: T; at: number }>();
  const inFlight = new Map<string, Promise<T>>();

  const remember = (key: string, value: T) => {
    entries.delete(key);
    entries.set(key, { value, at: now() });
    while (entries.size > max) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  };

  const sweepEvery = Math.min(KEYED_CACHE_SWEEP_MS, ttlMs / 2);
  const maxAge = 2 * ttlMs - sweepEvery;
  const sweep = () => {
    const cutoff = now() - maxAge;
    for (const [key, entry] of entries) if (entry.at < cutoff) entries.delete(key);
  };
  setInterval(sweep, sweepEvery).unref?.();

  return {
    get(key, fetcher, label = 'keyed-cache') {
      const hit = entries.get(key);
      if (hit && now() - hit.at < ttlMs) {
        // Refresh LRU position without resetting the freshness clock.
        entries.delete(key);
        entries.set(key, hit);
        return Promise.resolve(hit.value);
      }
      const pending = inFlight.get(key);
      if (pending) return pending;

      const run = fetcher()
        .then((value) => {
          remember(key, value);
          return value;
        })
        .catch((err: unknown) => {
          const stale = entries.get(key);
          if (stale) {
            const reason = err instanceof Error ? err.message : String(err);
            console.error(`⚠️ [${label}] fetch failed (${reason}) — serving last good copy`);
            return stale.value;
          }
          throw err;
        })
        .finally(() => {
          inFlight.delete(key);
        });
      inFlight.set(key, run);
      return run;
    },
    size() {
      return entries.size;
    },
    sweep,
  };
}

export interface CallBudget {
  /** Take one call from the budget; false = over the limit for this window. */
  tryTake(): boolean;
  /** Calls still available in the current window. */
  remaining(): number;
}

/** Sliding-window call budget (e.g. Sleeper: stay well under 1000 calls/min per IP). */
export function createCallBudget({ limit, windowMs, now = Date.now }: { limit: number; windowMs: number; now?: () => number }): CallBudget {
  const stamps: number[] = [];
  const prune = () => {
    const cutoff = now() - windowMs;
    while (stamps.length > 0 && stamps[0] <= cutoff) stamps.shift();
  };
  return {
    tryTake() {
      prune();
      if (stamps.length >= limit) return false;
      stamps.push(now());
      return true;
    },
    remaining() {
      prune();
      return Math.max(0, limit - stamps.length);
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
//  Live cache (/api/live/*: ESPN scoreboard + box scores shared by everyone)
// ──────────────────────────────────────────────────────────────────────────

/** HIT = served from memory (incl. joining another request's fetch) · MISS = this request fetched · STALE = last-good after a failure / backoff / spent budget. */
export type LiveCacheStatus = 'HIT' | 'MISS' | 'STALE';

export interface LiveResult<T> {
  value: T;
  status: LiveCacheStatus;
  /** When `value` was fetched (epoch ms). */
  updatedAt: number;
  /** How much longer `value` stays fresh (0 when STALE). */
  freshForMs: number;
}

/** Thrown (as a rejection) when a call budget is spent and there is no last-good copy. */
export class LiveBudgetError extends Error {
  constructor() {
    super('live call budget exhausted');
    this.name = 'LiveBudgetError';
  }
}

export interface LiveCacheOptions<T> {
  /** Log prefix, e.g. `live:scoreboard`. */
  label: string;
  /** Max keys kept; least-recently-used keys are evicted past this. */
  max: number;
  /** Keys with no upstream activity for this long are dropped by the lazy sweep. */
  retainMs: number;
  /** Freshness for a value, decided when it is stored (`now` = store time). */
  ttlFor: (value: T, now: number) => number;
  /** First retry delay after a failure; doubles per consecutive failure. */
  backoffBaseMs?: number;
  /** Retry delay cap. */
  backoffMaxMs?: number;
  /** Every upstream call takes one from each; any spent → no call. */
  budgets?: CallBudget[];
  /** Clock (tests). */
  now?: () => number;
}

export interface LiveCache<T> {
  /** Never throws synchronously; rejects only when there is no last-good copy to serve. */
  get(key: string, fetcher: () => Promise<T>): Promise<LiveResult<T>>;
  /** Number of keys held. */
  size(): number;
  /** Drop keys idle past `retainMs` (runs lazily inside `get`, at most every LIVE_CACHE_SWEEP_MS). */
  sweep(): void;
}

/** Longest gap between lazy sweeps. */
export const LIVE_CACHE_SWEEP_MS = 60_000;

/**
 * Keyed single-flight cache for live upstream data. Unlike createKeyedCache it
 * picks a TTL per value (live game 15s, idle 5 min …), backs off a failing key
 * exponentially (5→10→…→120s) while serving last-good as STALE, respects call
 * budgets, and reports HIT/MISS/STALE for the `X-Pare-Cache` header. Pull-based
 * only: no timers — retention is a lazy sweep on read. Memory only, per process.
 */
export function createLiveCache<T>({
  label,
  max,
  retainMs,
  ttlFor,
  backoffBaseMs = 5_000,
  backoffMaxMs = 120_000,
  budgets = [],
  now = Date.now,
}: LiveCacheOptions<T>): LiveCache<T> {
  interface Slot {
    entry: { value: T; at: number; ttlMs: number } | null;
    failures: number;
    failedAt: number;
    retryAt: number;
    lastError: unknown;
  }
  const slots = new Map<string, Slot>();
  const inFlight = new Map<string, Promise<LiveResult<T>>>();
  let lastSweep = now();

  /** Get or create a slot and move it to the most-recent LRU position. */
  const touch = (key: string): Slot => {
    const slot = slots.get(key) ?? { entry: null, failures: 0, failedAt: 0, retryAt: 0, lastError: null };
    slots.delete(key);
    slots.set(key, slot);
    while (slots.size > max) {
      const oldest = slots.keys().next().value;
      if (oldest === undefined) break;
      slots.delete(oldest);
    }
    return slot;
  };

  const sweep = () => {
    const t = now();
    lastSweep = t;
    const cutoff = t - retainMs;
    for (const [key, slot] of slots) {
      if (Math.max(slot.entry?.at ?? 0, slot.failedAt) < cutoff && !inFlight.has(key)) slots.delete(key);
    }
  };

  const stale = (slot: Slot | undefined): LiveResult<T> | null =>
    slot?.entry ? { value: slot.entry.value, status: 'STALE', updatedAt: slot.entry.at, freshForMs: 0 } : null;

  return {
    async get(key, fetcher) {
      const t = now();
      if (t - lastSweep >= LIVE_CACHE_SWEEP_MS) sweep();

      const slot = slots.get(key);
      if (slot?.entry && t - slot.entry.at < slot.entry.ttlMs) {
        touch(key);
        const { value, at, ttlMs } = slot.entry;
        return { value, status: 'HIT', updatedAt: at, freshForMs: ttlMs - (t - at) };
      }

      const pending = inFlight.get(key);
      if (pending) return pending.then((r) => (r.status === 'MISS' ? { ...r, status: 'HIT' } : r));

      if (slot && t < slot.retryAt) {
        const last = stale(slot);
        if (last) return last;
        throw slot.lastError;
      }

      if (!budgets.every((b) => b.remaining() > 0)) {
        const last = stale(slot);
        if (last) return last;
        throw new LiveBudgetError();
      }
      for (const b of budgets) b.tryTake();

      const run = (async (): Promise<LiveResult<T>> => {
        try {
          const value = await fetcher();
          const at = now();
          const ttlMs = ttlFor(value, at);
          const s = touch(key);
          s.entry = { value, at, ttlMs };
          s.failures = 0;
          s.retryAt = 0;
          s.lastError = null;
          return { value, status: 'MISS', updatedAt: at, freshForMs: ttlMs };
        } catch (err) {
          const s = touch(key);
          s.failures += 1;
          s.failedAt = now();
          const waitMs = Math.min(backoffBaseMs * 2 ** (s.failures - 1), backoffMaxMs);
          s.retryAt = s.failedAt + waitMs;
          s.lastError = err;
          const reason = err instanceof Error ? err.message : String(err);
          const last = stale(s);
          console.error(
            `⚠️ [${label}] ${reason} — ${last ? 'serving last good copy' : 'no last good copy'}; retry in ${waitMs / 1000}s`,
          );
          if (last) return last;
          throw err;
        } finally {
          inFlight.delete(key);
        }
      })();
      inFlight.set(key, run);
      return run;
    },
    size() {
      return slots.size;
    },
    sweep,
  };
}

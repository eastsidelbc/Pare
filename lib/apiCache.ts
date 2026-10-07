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
}

/**
 * Bounded in-memory LRU with per-key last-good + in-flight dedupe. Memory only
 * (never `unstable_cache`), so per-user data like usernames is never written
 * to disk. Lives for the server process, like createTtlCache.
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

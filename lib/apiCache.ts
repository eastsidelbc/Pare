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

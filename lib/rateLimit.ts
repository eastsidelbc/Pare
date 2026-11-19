/**
 * Per-visitor rate limit for /api/* (security hardening phase 3,
 * docs/devnotes/2026-11-19-security-phase3-rate-limit.md). Token bucket per IP per tier:
 * each request takes a token, tokens refill steadily, an empty bucket → 429.
 *
 * Memory only (one process, one Mac mini). Plain JS, no Node APIs, so it runs in middleware.
 * Bounded: at most MAX_KEYS buckets per tier; full buckets are swept, the oldest evicted.
 */

export interface RateTier {
  name: 'general' | 'upstream';
  /** Bucket size: how many requests in a quick burst. */
  capacity: number;
  /** Steady rate: tokens added per minute. */
  perMinute: number;
}

/** Generous on purpose: phone carriers put many visitors behind one IP (CGNAT). */
export const GENERAL: RateTier = { name: 'general', capacity: 240, perMinute: 240 };
/** Routes where a new input makes Pare call ESPN / Sleeper (fresh upstream work per key). */
export const UPSTREAM: RateTier = { name: 'upstream', capacity: 60, perMinute: 60 };

const UPSTREAM_PREFIXES = ['/api/myteam/', '/api/live/summary', '/api/leans/market', '/api/leans/data'];

export function tierFor(pathname: string): RateTier {
  return UPSTREAM_PREFIXES.some((p) => pathname.startsWith(p)) ? UPSTREAM : GENERAL;
}

/**
 * Who is asking. Pare listens on 127.0.0.1 only, so every outside request arrives through the
 * Cloudflare tunnel, and Cloudflare sets CF-Connecting-IP (a visitor can't override it). No
 * header = a process on the Mac itself (deploy health checks, curl), which is never limited.
 */
export function clientKey(headers: Headers): string | null {
  const ip = headers.get('cf-connecting-ip')?.trim();
  return ip && ip.length <= 64 ? ip : null;
}

export const MAX_KEYS = 10_000;

interface Bucket {
  tokens: number;
  at: number;
}

export interface Decision {
  ok: boolean;
  /** Whole seconds until one token is back (for Retry-After). */
  retryAfterSec: number;
  remaining: number;
}

export function createRateLimiter(now: () => number = Date.now) {
  const buckets = new Map<string, Map<string, Bucket>>();

  function take(tier: RateTier, key: string): Decision {
    let tierBuckets = buckets.get(tier.name);
    if (!tierBuckets) buckets.set(tier.name, (tierBuckets = new Map()));
    const t = now();
    const perMs = tier.perMinute / 60_000;
    const prev = tierBuckets.get(key);
    const tokens = prev ? Math.min(tier.capacity, prev.tokens + (t - prev.at) * perMs) : tier.capacity;

    // Re-insert so Map order = least-recently-seen first (cheap LRU).
    tierBuckets.delete(key);
    if (tokens < 1) {
      tierBuckets.set(key, { tokens, at: t });
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((1 - tokens) / perMs / 1000)), remaining: 0 };
    }
    tierBuckets.set(key, { tokens: tokens - 1, at: t });
    if (tierBuckets.size > MAX_KEYS) evict(tier, tierBuckets, t);
    return { ok: true, retryAfterSec: 0, remaining: Math.floor(tokens - 1) };
  }

  /** Drop buckets that have refilled completely (they'd start full anyway), then the oldest. */
  function evict(tier: RateTier, tierBuckets: Map<string, Bucket>, t: number) {
    const perMs = tier.perMinute / 60_000;
    for (const [k, b] of tierBuckets) {
      if (b.tokens + (t - b.at) * perMs >= tier.capacity) tierBuckets.delete(k);
    }
    while (tierBuckets.size > MAX_KEYS) {
      const oldest = tierBuckets.keys().next().value;
      if (oldest === undefined) break;
      tierBuckets.delete(oldest);
    }
  }

  return { take, size: (tier: RateTier) => buckets.get(tier.name)?.size ?? 0 };
}

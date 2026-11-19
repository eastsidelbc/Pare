import { describe, expect, it } from 'vitest';
import { clientKey, createRateLimiter, GENERAL, MAX_KEYS, tierFor, UPSTREAM } from '@/lib/rateLimit';

describe('rate limit', () => {
  it('allows a full burst, then 429s with Retry-After', () => {
    const rl = createRateLimiter(() => 0);
    for (let i = 0; i < UPSTREAM.capacity; i++) expect(rl.take(UPSTREAM, '1.2.3.4').ok).toBe(true);
    const d = rl.take(UPSTREAM, '1.2.3.4');
    expect(d.ok).toBe(false);
    expect(d.retryAfterSec).toBe(1); // 60/min = one token per second
  });

  it('refills steadily over time', () => {
    let t = 0;
    const rl = createRateLimiter(() => t);
    for (let i = 0; i < UPSTREAM.capacity; i++) rl.take(UPSTREAM, 'a');
    expect(rl.take(UPSTREAM, 'a').ok).toBe(false);
    t += 1_000; // one second → one token
    expect(rl.take(UPSTREAM, 'a').ok).toBe(true);
    expect(rl.take(UPSTREAM, 'a').ok).toBe(false);
    t += 60_000; // a minute → full again
    for (let i = 0; i < UPSTREAM.capacity; i++) expect(rl.take(UPSTREAM, 'a').ok).toBe(true);
  });

  it('keeps visitors and tiers separate', () => {
    const rl = createRateLimiter(() => 0);
    for (let i = 0; i < UPSTREAM.capacity; i++) rl.take(UPSTREAM, 'a');
    expect(rl.take(UPSTREAM, 'a').ok).toBe(false);
    expect(rl.take(UPSTREAM, 'b').ok).toBe(true);
    expect(rl.take(GENERAL, 'a').ok).toBe(true);
  });

  it('stays bounded at MAX_KEYS', () => {
    const rl = createRateLimiter(() => 0);
    for (let i = 0; i < MAX_KEYS + 50; i++) rl.take(GENERAL, `ip${i}`);
    expect(rl.size(GENERAL)).toBeLessThanOrEqual(MAX_KEYS);
  });

  it('routes that make fresh upstream calls get the stricter tier', () => {
    expect(tierFor('/api/myteam/user')).toBe(UPSTREAM);
    expect(tierFor('/api/live/summary')).toBe(UPSTREAM);
    expect(tierFor('/api/leans/market')).toBe(UPSTREAM);
    expect(tierFor('/api/leans/data')).toBe(UPSTREAM);
    expect(tierFor('/api/live/scoreboard')).toBe(GENERAL);
    expect(tierFor('/api/nfl-2025/offense')).toBe(GENERAL);
  });

  it('only trusts CF-Connecting-IP; no header = local process (not limited)', () => {
    expect(clientKey(new Headers({ 'cf-connecting-ip': '203.0.113.9' }))).toBe('203.0.113.9');
    expect(clientKey(new Headers({ 'x-forwarded-for': '203.0.113.9' }))).toBeNull();
    expect(clientKey(new Headers())).toBeNull();
    expect(clientKey(new Headers({ 'cf-connecting-ip': 'x'.repeat(65) }))).toBeNull();
  });
});

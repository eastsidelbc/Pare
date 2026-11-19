/**
 * Security headers + CSP, against the real server (CI: production build).
 * - every main page sends the security headers
 * - no page logs a CSP violation (Report-Only logs "[Report Only] Refused to …"), so the policy
 *   can be switched to enforcing without breaking anything.
 * Security hardening phase 3, docs/devnotes/2026-11-19-security-phase3-headers.md.
 */
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/compare', '/leans', '/leaderboards', '/myteam', '/standings'];

test.describe('security headers + CSP', () => {
  for (const path of PAGES) {
    test(`${path}: headers present, no CSP violations`, async ({ page }) => {
      const violations: string[] = [];
      page.on('console', (msg) => {
        const t = msg.text();
        if (/Content Security Policy|Refused to (load|execute|apply|connect|frame)/i.test(t)) violations.push(t);
      });
      const res = await page.goto(path, { waitUntil: 'networkidle' });
      expect(res?.status()).toBe(200);
      const h = res!.headers();
      expect(h['content-security-policy']).toContain("default-src 'self'");
      expect(h['x-frame-options']).toBe('DENY');
      expect(h['x-content-type-options']).toBe('nosniff');
      expect(h['cross-origin-opener-policy']).toBe('same-origin');
      if (process.env.CI) expect(h['strict-transport-security']).toContain('max-age=31536000');
      expect(h['x-powered-by']).toBeUndefined();
      expect(violations, violations.join('\n')).toEqual([]);
    });
  }
});

// API input validation + rate limit (security hardening phase 3,
// docs/devnotes/2026-11-19-security-phase3-rate-limit.md). Only the iPhone project runs these:
// they're about the server, not the viewport.
test.describe('API hardening', () => {
  test.skip(({ isMobile, viewport }) => !isMobile || (viewport?.width ?? 0) > 400, 'server checks run once');

  const BAD_INPUT = [
    '/api/schedule?week=999',
    '/api/live/scoreboard?week=abc',
    '/api/live/summary?event=../../etc',
    '/api/myteam/user?u=../../x',
    '/api/myteam/league?id=abc&uid=1',
    '/api/myteam/live?id=1&uid=1&w=99',
    '/api/leans/props?week=0',
    '/api/leans/market?event=1',
    '/api/leans/data?teams=NOPE',
  ];
  for (const path of BAD_INPUT) {
    test(`bad input → 400, no internals: ${path}`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(400);
      const body = await res.text();
      expect(body.length).toBeLessThan(200);
      expect(body).not.toMatch(/at \w+ \(|node_modules|\/Users\/|stack/i);
    });
  }

  test('too many requests from one visitor → 429 + Retry-After; other visitors unaffected', async ({ request }) => {
    const as = (ip: string) => ({ headers: { 'cf-connecting-ip': ip } });
    // Upstream tier = 60 burst. Invalid username → 400 without calling Sleeper.
    for (let i = 0; i < 60; i++) {
      expect((await request.get('/api/myteam/user?u=!!', as('198.51.100.7'))).status()).toBe(400);
    }
    const limited = await request.get('/api/myteam/user?u=!!', as('198.51.100.7'));
    expect(limited.status()).toBe(429);
    expect(Number(limited.headers()['retry-after'])).toBeGreaterThanOrEqual(1);
    expect(await limited.json()).toEqual({ error: 'rate-limited' });
    expect((await request.get('/api/myteam/user?u=!!', as('198.51.100.8'))).status()).toBe(400);
    expect((await request.get('/api/myteam/user?u=!!')).status()).toBe(400); // no CF header = local, never limited
  });
});

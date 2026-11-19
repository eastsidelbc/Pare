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
      expect(h['content-security-policy'] ?? h['content-security-policy-report-only']).toContain("default-src 'self'");
      expect(h['x-frame-options']).toBe('DENY');
      expect(h['x-content-type-options']).toBe('nosniff');
      expect(h['cross-origin-opener-policy']).toBe('same-origin');
      if (process.env.CI) expect(h['strict-transport-security']).toContain('max-age=31536000');
      expect(h['x-powered-by']).toBeUndefined();
      expect(violations, violations.join('\n')).toEqual([]);
    });
  }
});

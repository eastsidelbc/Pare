/**
 * Security headers (next.config.ts headers()): every route carries them, and the CSP never
 * loosens silently. Security hardening phase 3, docs/devnotes/2026-11-19-security-phase3-headers.md.
 */
import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

async function globalHeaders(): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? [];
  const all = rules.find((r) => r.source === '/:path*');
  if (!all) throw new Error('no /:path* header rule');
  return Object.fromEntries(all.headers.map((h) => [h.key, h.value]));
}

describe('security headers', () => {
  it('sets the baseline headers on every route', async () => {
    const h = await globalHeaders();
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(h['Cross-Origin-Resource-Policy']).toBe('same-site');
    expect(h['Permissions-Policy']).toContain('camera=()');
  });

  it('sends HSTS outside development (1 year, subdomains, no preload without sign-off)', async () => {
    const h = await globalHeaders();
    expect(h['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
  });

  it('CSP: self-only, no eval, no plugins, no framing', async () => {
    const h = await globalHeaders();
    const csp = h['Content-Security-Policy']; // enforced, not Report-Only
    expect(csp).toBeDefined();
    const d = Object.fromEntries(
      csp!.split(';').map((p) => p.trim().split(/\s+/)).map(([k, ...v]) => [k, v]),
    );
    expect(d['default-src']).toEqual(["'self'"]);
    expect(d['script-src']).not.toContain("'unsafe-eval'");
    expect(d['object-src']).toEqual(["'none'"]);
    expect(d['frame-ancestors']).toEqual(["'none'"]);
    expect(d['base-uri']).toEqual(["'self'"]);
    expect(d['connect-src']).toEqual(["'self'"]);
    // Nothing loads from a third-party host (ESPN / Sleeper are server-side only).
    for (const values of Object.values(d)) for (const v of values) expect(v).not.toMatch(/^https?:/);
  });

  it('never ships browser source maps', () => {
    expect(nextConfig.productionBrowserSourceMaps).toBe(false);
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});

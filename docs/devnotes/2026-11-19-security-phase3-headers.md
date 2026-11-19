# 2026-11-19 — Security phase 3, step 1: security headers + CSP (Report-Only)

Branch `security/phase3-headers`.

## What

`next.config.ts` `headers()`, `/:path*`:

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy-Report-Only` | self-only policy (below) | log violations first, enforce once clean |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (not in dev) | browsers always use HTTPS. **No `preload` without Kobe's OK** (hard to undo) |
| `Cross-Origin-Opener-Policy` | `same-origin` | other sites' windows can't script ours |
| `Cross-Origin-Resource-Policy` | `same-site` | other sites can't embed our responses |
| `X-Frame-Options` | `DENY` (was `SAMEORIGIN`) | plus CSP `frame-ancestors 'none'`; nothing frames Pare (the iOS app loads it top-level) |
| `productionBrowserSourceMaps` | `false` (explicit) | |

CSP: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; manifest-src 'self';
worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
(dev adds `'unsafe-eval'` and `ws:` for React dev tooling / HMR).

## Decisions

- **No third-party hosts.** Fonts are self-hosted by `next/font`; ESPN / Sleeper are fetched
  server-side. The Leaders page carries ESPN headshot/logo URLs in its RSC data, but no `<img>`
  renders them (checked the live HTML: 0 `<img src="https://a.espncdn…">`).
- **`script-src 'unsafe-inline'`, no nonces.** Next 15 docs: nonces need dynamic rendering for
  every page (ISR off), and hash-based SRI is webpack-only (we build with Turbopack). Pare renders
  no user-supplied HTML and every other directive is locked, so this is the accepted tradeoff.
  Revisit with Next 16 or if user content ever appears.
- **Report-Only first**, per the hardening plan: enforce only after the e2e check stays clean.

## Tests

- `lib/__tests__/securityHeaders.test.ts`: the config has every header, the CSP is self-only with
  no eval/objects/framing and no third-party hosts, and no source maps.
- `e2e/security.spec.ts` (CI, production build): every main page returns the headers, no
  `x-powered-by`, and **zero CSP violations in the console**.

# 2026-11-19 — Security phase 3, step 2: per-visitor API rate limit

Branch `security/phase3-rate-limit`.

## Why

The ESPN and Sleeper call budgets (`lib/espnLive.ts`, `lib/myteam/sleeper/http.ts`) are shared by
every visitor. One script could spend them all, and every real fan would then get "busy" (audit
finding M3). Bots were already probing the site.

## What

- `lib/rateLimit.ts`: a token bucket per IP per tier, in memory, bounded at 10,000 IPs per tier
  (fully refilled buckets swept, then the oldest evicted). Plain JS, so it runs in middleware.
  - **general**: 240 burst, 240/min. Generous: phone carriers put many visitors behind one IP.
  - **upstream**: 60 burst, 60/min for `/api/myteam/*`, `/api/live/summary`, `/api/leans/market`,
    `/api/leans/data` (a new input there means fresh ESPN/Sleeper work).
- `middleware.ts`: the matcher adds `/api/:path*`. Over the limit → `429 {"error":"rate-limited"}`
  with `Retry-After` and `Cache-Control: no-store`. The `/myteam` alias redirects are unchanged.
- **Who's who: `CF-Connecting-IP` only.** Pare listens on 127.0.0.1, so outside traffic always comes
  through the Cloudflare tunnel, which sets that header (visitors can't override it at the edge).
  Without the header = a process on the Mac itself (deploy health checks, curl): never limited.
  `X-Forwarded-For` is ignored (spoofable).
- A Cloudflare rate-limit rule on `/api/*` (phase 4) is the outer layer; this is the inner one.

## Tests

- `lib/__tests__/rateLimit.test.ts`: burst then 429 with Retry-After, steady refill, visitors and
  tiers kept apart, bounded memory, tier mapping, header trust.
- `e2e/security.spec.ts` "API hardening" (CI, production server): bad input → 400 with a short body
  and no stack/paths on 9 input-taking routes; 60 fast requests then a 429 + Retry-After from one
  fake visitor, while another visitor and local requests still pass. This also proves the limiter's
  memory persists across requests in the real middleware runtime.

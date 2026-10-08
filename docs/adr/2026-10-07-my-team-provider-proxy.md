# ADR: My Team — fantasy provider interface + server proxy for Sleeper

## Date
2026-10-07 (drafted P1) · finalized 2026-10-08 (P7)

## Status
Accepted (2026-10-08, P7). Built in P2 (`/api/myteam/{user,league}`) and P6 (`/api/myteam/live`) on `feat/my-team-sleeper`; ships with the P7 merge.

## Context
My Team links a user's Sleeper account (username only, stored on the device in `pare:myteam`) and rates each rostered player's NFL matchup. It needs:
- per-user data: user → leagues → league scoring → rosters → live matchups;
- shared data: weekly player stat lines (FPA), the season schedule (opponents/byes), and ESPN per-game defense logs.

Sleeper is the only v1 platform. ESPN/Yahoo fantasy may follow, so the UI must not depend on Sleeper's shapes.

Sleeper's documented guidance is to *"stay under 1000 API calls per minute, otherwise, you risk being IP-blocked"* (docs.sleeper.com, fetched 2026-10-07). Its responses sit behind Cloudflare with `s-maxage` of 60s (matchups, state) to 300s (league, rosters, users, weekly stats). Rate-limit headers: none (P0a spike, `docs/devnotes/2026-10-07-my-team-data-spike.md`).

## Decision
1. **Provider interface.**
   - `lib/myteam/provider.ts` defines `FantasyProvider`: `resolveUser`, `listLeagues`, `getLeague`, `getRoster`, `getLivePoints`.
   - A separate `StatLineSource` covers weekly stat lines.
   - The UI and engines only see normalized types (`lib/myteam/types.ts`). Sleeper is one adapter (`lib/myteam/sleeper/*`).
2. **Server proxy.** The browser calls only Pare's API (`/api/myteam/{user,league,live}`), which calls Sleeper through:
   - per-key in-memory LRU caches (memory only, never `unstable_cache`, which writes per-user data to disk);
   - one global call budget of ≈600 calls/min; past it, serve last-good.

   Cache times follow Sleeper's CDN: rosters 5 min, live matchups 60s.
3. **Ranking stays client-side.** The server sends raw per-week values (FPA table, defense/offense logs). The client windows them and ranks with `lib/ranking.ts`.

## Consequences
- **One IP for all users.** Every user's Sleeper traffic leaves the Mac mini's IP, so caching + the budget are mandatory. A cold load is ≤6 Sleeper calls; a warm load is 0; live is ≤1 call/min per watched league. That supports roughly 500 live leagues before last-good kicks in.
- **Usernames pass through our server.** They must never be logged or persisted server-side. `/privacy` describes the flow (section "Fantasy tab (Sleeper)", P7) — required before any deploy that exposes `/myteam` (F6).
- **No new browser third-party domain.** The App Store privacy story stays simple, and it lines up with the existing TODO to route ESPN live/box-score calls through our API.
- **Swappable providers.** Adding a provider = a new adapter + `registerProvider`, with no UI rewrite.

## As built (P2–P6)
- **One door:** `lib/myteam/sleeper/http.ts` `sleeperJson()` — no-store fetch, `AbortSignal.timeout` (5s; weekly stats 8s), budget `SLEEPER_CALLS_PER_MIN = 600` (`createCallBudget`). Over budget → `SleeperBudgetError` → route 503; other upstream errors → 502. Error messages never contain the URL.
- **Keyed caches** (`createKeyedCache`: bounded LRU + per-key last-good + in-flight dedupe, memory only): user 24h · leagues 1h · league 1h · rosters 5 min · matchups 60s.
- **Shared data** (no user data) may use `unstable_cache` over no-store: weekly stat lines (completed 24h / current 30 min), ESPN season schedule (6h/week).
- **Routes:** `force-dynamic`, `Cache-Control: private, no-store`, input validated (username `^[A-Za-z0-9_]{1,20}$`, numeric ids) → 400; no user input in logs or error bodies (`lib/myteam/apiErrors.ts`).
- **Live:** the client polls `/api/myteam/live` every 60s only inside `shouldPollMyTeam` (my games' live window from the existing ScheduleProvider ESPN poll, tab visible, route mounted, not all final). The 60s matchups cache means ≤1 Sleeper call per league per minute regardless of open tabs. P0b (live cadence on game day) confirms 60s.
- **Endpoints:** listed in `DATA_SOURCES.md` §5.

## Revisit triggers
- Sleeper 429/403 in `pm2 logs pare`, or budget 503s on a Sunday → move per-user calls to the hybrid fallback below.
- `api.sleeper.com` (undocumented stats host) changes shape or blocks us → documented host + ESPN opponents (data-spike devnote).
- Any monetization plan → the licensing blocker below.

## Fallback (documented, not built)
**Hybrid browser-direct** is the fallback if Sleeper rate-limits or blocks the shared IP:
- per-user calls (user, leagues, rosters, matchups) go from the browser straight to `api.sleeper.app` (each user's own IP);
- shared data (weekly stats, schedule, defense logs) stays server-side.

Cost:
- Sleeper becomes a browser third-party domain, which needs a `/privacy` update and an App Store privacy-label review;
- per-user caching moves to the client.

## Blocker — licensing (F7)
**Sleeper's API is for non-commercial use.** My Team makes Sleeper central to a feature. **Any paid tier, ads or other monetization is blocked** until Kobe has verified Sleeper's API terms and obtained written permission, or the feature moves to a licensed provider. ESPN data is unofficial and undocumented as well (CLAUDE.md "Licensing").

## Alternatives considered
- **Browser-direct only.** No shared IP risk, but a new third-party domain and no shared caching. Kept as the fallback above.
- **`unstable_cache` per user/league.** Persists usernames/league data to `.next/cache` on disk without bound. Rejected (privacy + disk growth).
- **Server-side ranking.** Violates the client-side-ranking rule. Rejected.

## Links
- Plan: `docs/plans/my-team-fantasy.md`
- Dev notes: `docs/devnotes/2026-10-07-my-team-data-spike.md`, `2026-10-07-my-team-p2-server.md`, `2026-10-07-my-team-p6-live.md`, `2026-10-08-my-team.md`
- Data sources: `DATA_SOURCES.md` §5 · Privacy: `app/privacy/page.tsx`
- CLAUDE: `CLAUDE.md` → Data / Licensing, Hard guardrails
- Commits: branch `feat/my-team-sleeper`

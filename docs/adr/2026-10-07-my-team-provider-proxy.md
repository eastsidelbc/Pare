# ADR: My Team — fantasy provider interface + server proxy for Sleeper

## Date
2026-10-07

## Status
Proposed (draft, P1). Becomes Accepted when P7 ships.

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
- **Usernames pass through our server.** They must never be logged or persisted server-side. `/privacy` must describe the flow before any deploy that exposes `/my-team` (F6).
- **No new browser third-party domain.** The App Store privacy story stays simple, and it lines up with the existing TODO to route ESPN live/box-score calls through our API.
- **Swappable providers.** Adding a provider = a new adapter + `registerProvider`, with no UI rewrite.

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
- Dev note: `docs/devnotes/2026-10-07-my-team-data-spike.md`
- CLAUDE: `CLAUDE.md` → Data / Licensing, Hard guardrails
- Commits: branch `feat/my-team-sleeper`

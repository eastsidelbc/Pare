# 2026-10-06 — Leaders "Neon Frame" (Standings match) + Rookie leaderboards

Branch: `ui/leaders-neon-frame`. Recipe: `docs/design-system.md` §9.3. Mockups: "Pare Rookie Leaders" canvas (Rounds 1–3).

## What changed
- `app/leaderboards/page.tsx` — `--bg-deep` page, H1 Inline header, D1 section labels (Standings `SectionLabel`), new Rookies divider + three rookie sections. Empty rookie boards hide; the whole block hides when there is no rookie list.
- `components/leaderboards/LeaderCard.tsx` — rewritten to the §9.2 list-card shell with the tight row (12px rank · 28px team · name · value, 3px gaps, rank centered). Team = `TeamAbbr` (list-safe team color). No logos, no framer-motion (removed the whileInView entrance and height:auto expand animation). Card is keyboard-togglable (Enter/Space).
- `components/leaderboards/FantasyBoards.tsx` — glass Total/PPG capsule (same as Standings header toggle, 44px hit area); sticky header on solid `--bg-deep` (dropped the backdrop blur). Logic unchanged.
- `components/leaderboards/grid.ts` — shared `LEADER_GRID` (min 170 → 2-up on iPhone).
- `lib/fantasy.ts` — slim Sleeper map marks `rookie: true` for `years_exp === 0` players (+ `rookieEspnId` when Sleeper has one); cache key bumped to `sleeper-player-map-v3`; new `getRookieIndex()`.
- `lib/rookieMatch.ts` (new) — `normalizePlayerName()`, `rookieKey()`, `isRookieRow()`: match ESPN rows by ESPN id or normalized name + team. Tests: `lib/__tests__/rookieMatch.test.ts`.
- `lib/leaders.ts` — `fetchRows()` split out of `fetchBoard()` (main boards unchanged: limit 25, fetch-cached 6h). New rookie sections (`rookieOffense/Defense/Special`), `getDeepRows()` (ESPN limit 300, fetched no-store, trimmed rows held by `unstable_cache` 6h; throws on error/empty so nothing bad is cached), `fetchRookieBoard()`, `getRookieBoards()`. `athleteId` is now always a string (ESPN sends a number).

## Why this way
- ESPN's league top 25 has almost no rookies, and ESPN's `debutYear` is missing for many players, so rookies come from Sleeper (`years_exp`). Sleeper rarely has rookies' `espn_id` (5 of 476 on 2026-10-06), so they're matched to ESPN by id OR normalized name + team.
- The 300-deep ESPN response is big, so it follows the player-map pattern: raw fetch no-store, cache only the small trimmed result.

## Verified
- `tsc --noEmit` ✓, `eslint` on the changed files ✓ (run on Kobe's PC via the Linux VM).
- NOT run here: `vitest` and `next build` (the PC's node_modules are Windows-native) — Kobe runs `npm run check` + `npm run test:run` on the PC, then checks Rookies on `localhost:4000/leaderboards`.
- Live data check pending: the sandbox couldn't reach ESPN/Sleeper. ESPN accepts `limit=1000` (checked: count 1739, limit honored).

## Known / next
- Freshness audit fixes from the Leaders Round 1 handoff (timeouts, last-good, shorter revalidate) are NOT in this change.
- If Sleeper's player map ever caches empty (`{}` for 24h), both Fantasy QB–K and the Rookies block go empty until it refreshes (existing behavior, flagged in the audit).

## Fix log — Rookies section was empty on first run (same day)
- Root cause (checked on Kobe's PC): Sleeper flags 476 rookies on a team but only 5 have an `espn_id`, so id-only matching found almost no one and the block hid.
- Fix: new `lib/rookieMatch.ts` — match ESPN rows to rookies by ESPN id OR normalized name + team (lowercase, no accents/punctuation, Jr/Sr/II–V dropped; team via `normalizeTeamAbbr`, e.g. ESPN WSH → WAS). Team must match, so a same-named veteran elsewhere isn't picked up.
- `lib/fantasy.ts`: slim map stores `rookie: true` for every rookie (+ `rookieEspnId` when present); cache key → `sleeper-player-map-v3`; `getRookieEspnIds()` → `getRookieIndex()`.
- Tests: `lib/__tests__/rookieMatch.test.ts`.
- Known edge: a rookie traded mid-season only matches once Sleeper updates his team.

---

## Round 2 — R3 "edge-to-edge" + freshness fix + perf (same day, on top of `786cdf6`)

### Design (Kobe's final pick on the "Pare Leaders Redesign v2" canvas)
- 2 across on iPhone, 4 / 5 on iPad; 32px rows pushed to the card edges (`14px · 30px · 1fr · auto`, padding `0 6px 0 3px`), rank 11px right-aligned (#1 gold-bright), short names via `lib/playerName.ts` (`shortPlayerName`: "J. Smith-Njigba", keeps "C.J."/"DK"; full name in `title`).
- Plain FANTASY header + TOT/PPG toggle (sticky bar + "(PPR)" removed, no position switcher). 44px "All 25" `<button>` replaces the whole-card `role=button` (an open card spans both columns on iPhone). Header jump capsule FAN · OFF · DEF · ST · R (plain anchors, R only when Rookies render). Follow-up (Kobe): the current section's link wears the gold ring and follows the scroll — `JumpNav.tsx` (client), passive scroll listener throttled to one read per frame, last section whose top is within 64px of the scroll area's top; at the bottom the last section wins; rookie divider + sections share one `#lb-rookies` wrapper so R stays lit. Re-measured: scroll still 60 fps / 0 dropped, idle ~2ms per 5s, 0 animations.
- `normalizeTeamAbbr()` before `TeamAbbr` — ESPN's WSH/JAC/LA rows were rendering white.
- `components/ui/CardGrid.tsx` (shared): `maxCols` enforced in the track minimum (`max(min(minCard,100%), (100% − gaps)/maxCols)`), `auto-fill`, `align-items: start`. QA found Leaders packing 6 across at 1194px, short sections getting wider cards, and an open card stretching its row-mates. Standings checked side by side old vs new at 361/802/1162px content widths: identical columns and widths.

### Freshness — audit (proven in a sandbox with faked ESPN/Sleeper, before the fix)
- Effective page ISR was already 300s (the layout's schedule fetch wins over `revalidate = 21600`); boards were fetch-cached 6h → **worst case ≈ 6h05m** after ESPN updates.
- ESPN 503 during a regen → Next re-fetches stale cached fetches in the foreground → empty boards cached ~5 min. Empty/reshaped 200 → cached 6h. Hang → regen stuck until restart. Sleeper player-map failure → `{}` cached 24h (fantasy QB–K + Rookies blank).
- Key gotcha: Next **drops a fetch's `signal`** when refreshing a stale cached fetch during ISR (`patch-fetch.js` ~580–600), so a timeout on a cached fetch doesn't help.

### Freshness — fix
- `lib/leaders.ts`: `getBoardRows` (and the existing `getDeepRows`) = `unstable_cache` 30 min around a **no-store** fetch with `AbortSignal.timeout` (5s / 10s); throws on HTTP error, timeout, missing stat column or empty list → nothing bad is cached and the previous cached rows keep serving; `liveWithLastGood` per board on top.
- `lib/fantasy.ts`: Sleeper stats → `getCachedSeasonStats` (same pattern, 8s, trimmed to `pts_ppr/pts_std/gp`); player map throws instead of returning `{}` (20s timeout) + last-good; one shared in-flight promise so a cold cache downloads the 20MB map once, not twice.
- `app/leaderboards/page.tsx`: `revalidate = 300` (honest); `RefreshOnReturn` (10 min) via `useRefreshOnReturn`.
- Re-sim results: 503 mid-regen → previous rows kept (569/569) · empty200 / badshape200 → previous rows, fresh after recovery · **hang → all 25 calls abort, regen completes, 0 stuck, fresh data within 1–2 page windows after recovery** · restart during an outage with stale caches → full boards (from `unstable_cache` on disk) · Sleeper players 503 on first fill → nothing cached, fills on the next regen; at a 24h refresh the old map stays.
- **Worst case now ≈ ESPN lag + 30 min (data) + 5 min (page) + one extra load ≈ 35–40 min**; typical ~15–20 min.

### Performance (sandbox prod build, Chromium, CPU throttled 4×, median of 3; fixture 12 boards × 25 + fantasy 6 × 50 + 11 rookie boards; 190ms fake upstream)
| Metric | iPhone 14 Pro 393×759 @3x | iPad 834×1194 | iPad 1194×834 | "Good" bar |
|---|---|---|---|---|
| TTFB | 13ms | 16ms | 12ms | < 800ms |
| LCP | 0.25s | 0.29s | 0.26s | < 2.5s |
| Load long tasks / TBT | 3 / 161ms (longest 140 = hydration) | 3 / 200ms | 4 / 175ms | TBT < 200ms at 4× |
| Expand top 5 → 25 / collapse (tap → paint) | 50 / 31ms | 56 / 31ms | 50 / 31ms | < 200ms (INP) |
| TOT ↔ PPG | 39 / 38ms | 40 / 40ms | 41 / 42ms | < 200ms |
| Jump link (R) | 26ms | 19ms | 8ms | < 200ms |
| Scroll whole page | 60 fps, 0 dropped | 60 fps, 0 dropped | 60 fps, 0 dropped | 60 fps |
| Home → Leaders (tap → ready) | 0.36s | 0.31s | 0.33s | — |
| Idle main thread (5s) | 1.4ms | 2.4ms | 2.2ms | ~0 |
| Running animations at rest | 0 | 0 | 0 | 0 |
| DOM nodes | 1,205 | 1,205 | 1,205 | < 1,500 |

- Verdict: **no perf fixes needed.** None of the old screen's costs remain: no `backdrop-filter` (the fantasy bar's blur), no framer `whileInView` per card, no `height:auto` expand animation, no logo `<img>` per row (grep-verified).
- Worth knowing: the HTML is 361 KB raw / **30 KB gzipped** — the RSC payload carries 50 fantasy candidates per position (for PPG re-ranking) plus unused `teamLogo` URLs. Fine today; trimming `teamLogo`/`headshot` from the server→client props would cut it if it ever matters.
- Gaps: headless Chromium doesn't record Paint events (repaints not measured; idle CPU + 0 animations cover it). Sandbox is Chromium, not iOS Safari.

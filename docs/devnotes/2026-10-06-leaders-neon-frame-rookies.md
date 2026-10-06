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

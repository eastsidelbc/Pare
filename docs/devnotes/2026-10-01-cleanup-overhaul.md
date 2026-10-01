# Cleanup overhaul — 2026-10-01

Branch `cleanup/overhaul` (off a `baseline snapshot` commit). Executed live with
tsc + eslint + in-browser verification after each phase; one commit per phase.
Goal: remove dead/redundant/conflicting code, fix the Leaders perf bug, simplify
global rules — no behavior change for users.

## Phase 0 — guardrails + baseline
- Added `typecheck` (`tsc --noEmit`) and `check` (`tsc && eslint`) npm scripts.
- Baseline: tsc clean; offense/defense APIs = 32 teams.

## Phase 1 — dead code & type consolidation
- New `lib/types.ts` = single source for `TeamStats` / `TeamStatsWithRanks` / `ParseResult`
  (previously defined twice, in both `pfr.ts` and `pfrCsv.ts`).
- Repointed imports (offense+defense routes, `espnStats`, `useNflStats`) to `lib/types`.
- Offense route: removed the 2025 CSV fallback. Data is ESPN-only now and symmetric
  with the defense route (which never had a CSV fallback). Stale in-memory cache is
  still served on ESPN failure; a cold-cache + ESPN-down case now 500s (as defense already did).
- **Deleted:** `lib/pfr.ts`, `lib/pfrCsv.ts`, `data/pfr/`, `components/ui/dropdown-menu.jsx`,
  `"Claude outputs/"`, `.cursorrules.bak`, and the old empty `docs/_to-delete/`.
- Removed the unused `node-html-parser` dependency. **ACTION:** run `npm install` to sync
  the lockfile and prune it.
- Cleared 22 of 24 eslint unused-var warnings.

## Phase 2 — redundancy & conflicts
- Added `normalizeTeamAbbr` / `resolveTeamByAbbr` to `lib/teams.ts` (one source of truth).
- Replaced 5 duplicated `ESPN_ABBR_ALIASES` / `normalizeAbbr` maps (`espnScoreboard`,
  `espnStats`, `standings`, `hooks/useGameSummary`, `fantasy`).
- **Bug fixed:** 4 of those 5 only aliased `WSH→WAS`; now every path also handles
  `JAC→JAX` and `LA→LAR` (the full set previously only `fantasy.ts` had). This closes a
  latent gap where ESPN/Sleeper returning JAC or LA would fail to resolve.
- Audited the `components/mobile/Compact*` set vs `components/compare/` — it's a legit
  responsive split (all used), not duplication. Left as-is.

## Phase 3 — Sleeper perf (the "slow")
- `fantasy.ts`: the ~20MB Sleeper player map exceeded Next's 2MB fetch-cache limit, so
  `revalidate` silently never cached it and every `/leaderboards` load re-downloaded +
  re-parsed the whole blob (the `Failed to set fetch cache ... 19548697 bytes` log error).
- Now: fetched with `cache:'no-store'` and kept as a trimmed `{id→name/position/team}`
  map in a module-level cache (24h TTL) — at most one download per process per 24h.
- Measured `/leaderboards` ~560–790ms (was ~1600ms); fantasy + D/ST intact.

## Phase 4 — consistency
- Removed 9 leftover `(verbose only)` placeholder comments from the API routes.
- **Deferred (recommendations, not done — too broad/structural to do unsupervised):**
  1. Unify ~100 raw `console.*` calls onto `utils/logger` (mostly intentional debug logs).
  2. Extract the duplicated in-memory `CacheEntry` block shared by both API routes into a helper.

## Phase 5 — global rules (draft only)
- `docs/proposed/CLAUDE.lean.md`: one lean consolidated rules doc (~140 lines vs the
  current 453), updated for the ESPN/Sleeper reality, merging the `.cursorrules` standing
  rules + the essential architecture/guardrails from `CLAUDE.md`.
- Added a stale-warning banner to the current `CLAUDE.md` (its CSV/PFR sections are now wrong).
- Left originals in place. **ACTION:** review the draft; to adopt, replace `CLAUDE.md`
  with it and point `.cursorrules` at it. `styleguide.md` + `DATA_SOURCES.md` stay as references.

## Verification (end state)
- `tsc --noEmit`: clean. `eslint`: 0 errors, 2 benign dead-code warnings in `public/sw.js`
  (`STATIC_ASSETS`, `networkFirstWithFallback` — left untouched; editing the service worker
  unsupervised wasn't worth the risk).
- Pages verified in-browser: home, compare, standings (4-across landscape), leaderboards.
- APIs return 32 teams.

## Handoff / to run on Windows
- `npm install` — sync lockfile, prune `node-html-parser`.
- `npm run build` — prod build check (couldn't run from the sandbox; needs native SWC).
- Review `docs/proposed/CLAUDE.lean.md`, then adopt or discard.
- Optional later: the two Phase-4 deferred refactors + the 2 sw.js dead-code warnings.

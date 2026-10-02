# Session Dev Note — Dead-Code Retire, Picker a11y + Premium Motion, Token Cleanups, CI Guard

**Date:** 2026-10-02
**Scope:** Continued the design-system work after the Tailwind v4 migration + Phase 3 token sweep. Retired two tranches of dead code, rebuilt the compact pickers' accessibility + motion, added NumberFlow stat rolls, tokenized the last raw-color offenders, dropped unused libs, and added a CI drift guard.
**Status:** All changes verified green (`npm run check`, 29/29 tests, `npm run build`) and deployed to pare.gg. A few items deliberately held for a hands-on session (see **Pending**).

---

## What shipped this session

### 1. Visual QA of the live v4 site — PASS
- Home / Compare / Standings / Leaders checked at 393px (iPhone 14 Pro), dark mode. No console errors. Last v4 gate cleared.
- Non-issue found: BUF renders as a blue "BILLS" wordmark — that's the **real old Bills logo** from ESPN, not a broken asset (confirmed by Kobe).

### 2. Retired the dead desktop Compare stack (5 files)
- **Key finding:** `ComparePane`'s desktop `else` branch (OffensePanel/DefensePanel → TeamDropdown) was **unreachable**. `useIsMobile()` defaults to `<1024px`; the phone pager only runs `<768px` (so `isMobile` is always true there) and `CompareQuadrants` hardcodes `isMobile` on every `ComparePane`. The desktop layout never executed at any width.
- `ComparePane` trimmed to the mobile-only path (full / inline / quadrant via `variant`). `isMobile`/`isLoadingOffense`/`isLoadingDefense` kept in the props interface for call-site compatibility, no longer destructured.
- Moved to `_to-delete/2026-10-02-dead-desktop-compare/`: `OffensePanel`, `DefensePanel`, `DynamicComparisonRow`, `RankingDropdown`, `TeamDropdown`.
- `tsconfig.json` now excludes `_to-delete` (so staged files aren't type-checked, and any stray `@/components/...` import of a moved file surfaces as a build error = proof-of-death). Build was green → confirmed dead.

### 3. Compact pickers — a11y + token polish
`CompactRankingDropdown`, `CompactTeamSelector`, `CompactPanelHeader`:
- `role="listbox"` + `role="option"`/`aria-selected` on rows; `aria-haspopup="listbox"` + `aria-expanded` on triggers; `aria-pressed` on the PG/TOT toggle.
- `rounded-2xl`(16) → `rounded-[var(--radius-xl)]`(20); `shadow-2xl` + inline `0 8px 32px` → `var(--shadow-pop)`; small chips → `var(--radius-sm)`. Stale "purple accents" doc-comments fixed.
- **Note:** the pickers were already on `@floating-ui/react` (dismiss/flip/shift/size), so this was a polish pass, **not** a Radix rebuild (Radix would have lost the hand-tuned narrow-screen positioning).

### 4. Premium motion on both dropdowns
- Spring pop-open, dim + **blurred backdrop**, **staggered row reveal** (per-row `delay`, capped), **selected-row gold left-accent bar** (`inset 3px 0 0 var(--gold)`), `whileTap` scale. Respects `prefers-reduced-motion` (framer + NumberFlow both do).

### 5. NumberFlow — rolling stat values
- Added `@number-flow/react`. `CompactComparisonRow` now renders each stat through a `StatValue` wrapper: numbers roll via `<NumberFlow>` (Intl format + `%` suffix), while missing (`—`) and time (`MM:SS`) fall back to plain text. Removed the old `formatValue`/`formattedA`/`formattedB`.

### 6. Retired dead "phase-2" components (8 files)
- Traced a closed dead cluster (exhaustive import grep): nothing live references any of them.
- Moved to `_to-delete/2026-10-02-dead-phase2/`: `QuadrantMetricsButton`, `FloatingMetricsButton`, `MetricsSelector`, `TeamSelector`, `TeamSelectionPanel`, `ThemeCustomizer`, `lib/metricsSelectorPreload.ts`, `lib/useTheme.ts`. **`ErrorBoundary`** retired too (unused; Next's `error.tsx`/`global-error.tsx` cover route errors).

### 7. `styleguide.md` retired
- Moved to `_to-delete/2026-10-02-dead-phase2/`; a one-line pointer left at repo root → `docs/design-system.md` (+ `app/globals.css :root`).

### 8. Dropped 3 unused libs
- `@react-spring/web`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select` — confirmed zero imports (`git grep ... -- app components lib utils`), `npm uninstall`ed. (One animation lib now: framer-motion.)

### 9. Last raw-color cleanups
- **Offline banner** → new `--warn` / `--warn-text` tokens (amber), no more `amber-*` palette classes.
- **PWA install prompt** → gold tokens (purple gone); also `shadow-2xl`→`shadow-pop`, `text-white`→`text-text`.
- **`themeColor`** meta `#0f172a` → `#0a0e1a` (matches `--bg`).

### 10. CI design-token guard
- New step in `.github/workflows/ci.yml`: **fails** the build if any raw Tailwind palette color class (`bg-slate-700`, `text-purple-400`, …) appears in `app/` or `components/`; lists hex literals as informational (non-failing). `_to-delete/` is outside the scanned dirs, so staged dead code is ignored.

### Decisions resolved
- **`--badge-*` palette** (rank-tier gold/red/slate) is kept as an **intentional sub-palette**, documented in `globals.css` — not drift. The "third gold" (`--badge-gold #e8b923`) stays distinct from `--gold`/`--gold-bright` on purpose (tuned for pill contrast).
- NumberFlow kept (a garnish — Kobe's reaction was lukewarm but fine).
- ErrorBoundary → deleted rather than re-adopted.

---

## Environment gotchas (for next session)

- **PowerShell 5.x rejects `&&`** — run commands on separate lines.
- **`git grep` exclude pathspec** — `:!_to-delete` / `:(exclude)` fails on this git version ("Unimplemented pathspec magic"). Scope to the live dirs instead: `git grep -n "pattern" -- app components lib utils`.
- **Windows `.next` ENOENT** (`_buildManifest.js.tmp.*`) — the OneDrive-syncs-`Documents\` temp-file race. Fix: `npm run dev:clean`. Durable fix: move the repo out of OneDrive's sync path.
- **`repos` MCP `edit_file` worked reliably** this session (contrary to the older note about the "pare" server) — fine for surgical edits; `write_file` full-replace still the fallback. Still filesystem-only (no shell — Kobe runs npm/git/build).

---

## Pending — pick up here

1. **Quadrant card-in-card** — the tablet/desktop quadrant wraps a `--card` frame around panels that are already `--card`s (on a `--bg` band). Fix per design-system §4: drop the outer frame so the panels are the only cards. **Catch:** the × close control is pinned to that frame's edge and detaches when the frame goes — needs re-placing live (both top corners hold team logos; the 6px gap is too thin for a floating button). Hands-on.
2. **Radius remap** — make `rounded-lg`=14 / `rounded-xl`=20 real in `tailwind.config` (`theme.extend.borderRadius` → `var(--radius-*)`), then sweep card `rounded-xl` → `rounded-lg`. App-wide visual shift → do as its **own isolated commit** and eyeball every screen (design-system §3 warns about this). The pickers currently use arbitrary `rounded-[var(--radius-xl)]` as a workaround until this lands.
3. **Keyboard arrow-nav + focus-trap** on the dropdowns — Floating UI `useListNavigation` + `FloatingFocusManager`. Needs live keyboard testing (held — not shippable blind).
4. **Structural premium pass** (the real "Sleeper-tier" lever) — type scale, spacing rhythm, color depth/contrast, elevation. Parked pending which screen Kobe wants to start on (Home / Compare / Standings).

### Minor / housekeeping
- `focus-ring` purple `#8b5cf6` (×3) + the purple tap-highlight `rgba` in `globals.css` → could become `var(--gold)` (last purple in the app).
- Full `@theme` token port + move `:root`/base out of `@layer utilities` into `@layer base` (v4 housekeeping, deferred from the migration).
- **Watch the first CI "Design-token guard" run** — if it reds on the regex, tune it.
- **Delete the `_to-delete/` folders** in Explorer (14 dead files + `styleguide.md` + `ErrorBoundary`) once comfortable.
- iOS H2 (prod URL → `pare.gg`) + M4 (ATS) when the iOS track resumes; H1 data licensing before monetizing.

---

## Addendum — data freshness, odds, version visibility (same day, later)

After the UI batch above, a run of data/infra fixes (all shipped + deployed):

### Odds now persist on completed games
- **Root cause (two bugs):** `lib/espnScoreboard.ts` only kept the betting line when `state === 'pre'` — it discarded `odds` for live/final games **even though ESPN still ships the line in the scoreboard**. Separately, the `attachClosingOdds` fallback (per-event odds endpoint) cached a miss for **30 days**, so a game that flipped final before ESPN published its closing line got stuck with no odds.
- **Fix:** mapper keeps `odds` for any game state (`rawOdds?.details ? … : null`). Fallback cache cut 30d → **6h** (`CLOSING_ODDS_REVALIDATE_SECONDS`) so a miss self-heals. Completed games keep their line like older games always did.

### `/api/health` now reports the running build
- `next.config.ts` bakes `GIT_SHA` (`git rev-parse --short HEAD`) + `BUILD_TIME` into `env` at build; `/api/health` returns `commit` + `builtAt`. One `curl https://pare.gg/api/health` from anywhere tells you exactly what's deployed (verified: `commit:"e3ce68c"`). The route is `no-cache`, so it always reflects the live build.

### Standings freshness — ISR → fully dynamic (live)
- **Why pare.gg lagged while `localhost` was instant, same code:** `localhost:4000` is `next dev` (ignores ISR + fetch cache → always fresh); `pare.gg` is `next build` + `next start` (honors ISR → cached). That's the whole difference — dev vs prod runtime, not the code.
- **Compounders:** (a) `next build` **reuses `.next/cache`** fetch entries, so a rebuild can bake stale ESPN data unless `npm run clean` wipes it first; (b) self-hosted ISR is **lazy/traffic-triggered** — first request after the window serves stale then regenerates, so you often see fresh only on the *second* reload.
- **Ruled out:** Cloudflare (both `/standings` and `/api/standings` return `cf-cache-status: DYNAMIC` — CF isn't caching); the `pare-tunnel` cloudflared process (a dumb pipe, no caching); wrong/old prod build (`/api/health` confirmed latest commit).
- **First pass:** split the cache window — added `LIVE_REVALIDATE_SECONDS: 300` for standings + scoreboard, kept `REVALIDATE_SECONDS: 3600` for the heavy offense/defense stat aggregation.
- **Final (correct) fix:** standings are live data, so they shouldn't be cached at all. `app/standings/page.tsx` + `app/api/standings/route.ts` → `export const dynamic = 'force-dynamic'`; `getStandings()` fetches `cache: 'no-store'`. Fresh ESPN pull every request, no stale window, no two-step. (`/standings` + `/api/standings` now build as `ƒ (Dynamic)`.)

### Env / infra findings (for next session)
- **dev ≠ prod caching** — never diagnose prod staleness by comparing to `next dev`; dev doesn't cache. Compare prod to prod (`curl -sI … | grep cache-control`: dynamic routes drop `s-maxage`).
- **`next build` reuses `.next/cache`** — to force a genuinely fresh data bake on the Mac mini, `npm run clean` before `npm run build` (not needed for `no-store`/dynamic routes).
- **Cloudflare isn't caching the app** (`cf-cache-status: DYNAMIC`); the `pare-tunnel` process is just a proxy — restarting it never affects data freshness.
- **WebFetch from the Cowork cloud box is NOT a reliable view of ESPN** — it returned `0-0` for games that Kobe's own network shows live. Verify ESPN data on Kobe's machines, not from here.

### Still open (data)
- **Compare offense/defense stats** are still **1h-cached** on purpose — that defense aggregation makes 16+ ESPN calls per refresh, so per-request/no-store would be slow and risk rate-limiting. If they need to be fresher on game day, lower to ~10 min (don't make dynamic). Decision pending.
- **Option B — on-demand revalidation** (`revalidatePath` + a scheduled ping when games finalize) is the only way to get *everything* Vercel-instant on self-hosted without per-request fetches. Deferred.
- **Auto-refresh standings while the tab is open** would need client-side polling (like the 15s live-score poll); right now standings are fresh on load but don't tick while viewing.

# Tailwind CSS v3 → v4 Migration (2026-10-01)

Rules + rationale: `.cursorrules`, `CLAUDE.md`, `docs/design-system.md`.

---

## What was done

### Step 1 — Clean v3 baseline (commit `e70ace1`)

Previous shadcn-init + `@tailwindcss/upgrade@next` attempts left pollution on local `main`
(commit `93dfbc9`): `@import "shadcn/tailwind.css"`, `@import "tw-animate-css"`, shadcn
oklch `:root`/`.dark` blocks overwriting our dark tokens, junk deps (`shadcn`, `cn`,
`tw-animate-css`, `radix-ui` unified), and Geist font added to `app/layout.tsx`.

Cleaned by restoring `origin/main` (last clean push) for the four polluted files:

```
git checkout origin/main -- app/globals.css app/layout.tsx package.json package-lock.json
git rm --ignore-unmatch components.json components/ui/button.tsx
npm i class-variance-authority clsx tailwind-merge
```

**Kept** from local `main` (93dfbc9): `tailwind.config.js` design-system token mapping,
`lib/utils.ts` cn(), `docs/design-system.md`, devnotes, CHANGELOG, and all component changes
(quadrant close-tab etc.).

---

### Step 2 — v4 migration (commit `741a990`)

Ran the stable codemod:
```
npx @tailwindcss/upgrade --yes
```
(`@next` version crashed with `TypeError: Cannot read properties of undefined (reading 'flatMap')`;
stable `4.3.3` ran cleanly.)

#### What the codemod changed

**`app/globals.css`**
- `@tailwind base/components/utilities` → `@import 'tailwindcss'`
- Added `@config '../tailwind.config.js'` (v4 compat — keeps the legacy config; no full `@theme`
  port needed)
- Added border-color compatibility block (`var(--color-gray-200, currentcolor)`)
- Migrated every custom CSS class to `@utility` blocks at top level:
  `touch-optimized`, `safe-area-padding`, `momentum-scroll`, `sr-only`, `focus-ring`,
  `skeleton`, `no-scrollbar`
- Preserved our dark `:root` tokens inside `@layer utilities` (see token confirmation below)
- Retained `@layer base` (text-size-adjust, typography clamp, PWA media queries, keyframes)

**`postcss.config.mjs`**
- `tailwindcss: {}` → `'@tailwindcss/postcss': {}`
- `autoprefixer` removed (v4 bundles it)

**`package.json`**
- `tailwindcss` devDep: `^3.4.3` → `^4.3.3`
- Added `@tailwindcss/postcss: ^4.3.3` to devDeps
- Removed `autoprefixer`

**Template renames in 20 `.tsx` files** (codemod-applied):
| Old | New |
|-----|-----|
| `flex-shrink-0` | `shrink-0` |
| `focus:outline-none` | `focus:outline-hidden` |
| `min-h-[2.75rem]` | `min-h-11` |
| `min-h-[2rem]` | `min-h-8` |
| `min-h-[3rem]` | `min-h-12` |
| `min-h-[3.5rem]` | `min-h-14` |
| `min-w-[3rem]` | `min-w-12` |
| `min-w-[3.5rem]` | `min-w-14` |
| `rounded` | `rounded-sm` |
| `backdrop-blur-sm` | `backdrop-blur-xs` |
| `z-[60]` | `z-60` |
| `bg-gradient-to-br` | `bg-linear-to-br` |
| `bg-[radial-gradient(...,_var(--tw-gradient-stops))]` | removed extra `_` before `var(` |

Files migrated: `TeamSelector`, `MatchupCardSkeleton`, `QuadrantMetricsButton`,
`TeamSelectionPanel`, `OfflineStatusBanner`, `OffensePanel`, `PostGameBox`, `ErrorBoundary`,
`DefensePanel`, `ComparePane`, `CompactRankingDropdown`, `CompactTeamSelector`,
`ThemeCustomizer`, `TeamDropdown`, `MobileCompareLayout`, `CompareWorkspace`,
`PWAInstallPrompt`, `RankingDropdown`, `MetricsSelector`, `FloatingMetricsButton`.

#### Manual fixes after codemod

1. **Removed duplicate utility definitions** — `tailwind.config.js` had `addUtilities({
   '.touch-optimized': ..., '.focus-ring': ... })` which duplicated the codemod-generated
   `@utility` blocks. Removed the `addUtilities` function; kept only `require('@tailwindcss/typography')`.
2. **Enhanced `@utility touch-optimized`** — the codemod's generated version was missing
   `-webkit-touch-callout: none`, `-webkit-user-select: none`, `user-select: none` that the
   original plugin had. Added them back for full parity.
3. **`@tailwindcss/typography`** — still loads via `@config '../tailwind.config.js'`; no
   `@plugin` directive needed since we're using the compat config path.

---

## Verification — actual output

### `npm run check` (tsc + eslint)
```
> pare-nextjs@0.1.0 check
> tsc --noEmit && eslint
[no output — 0 errors]
```
**PASS**

### `npm run test:run`
```
✓ utils/__tests__/teamDataTransform.test.ts (4 tests) 2ms
✓ utils/__tests__/ordinal.test.ts (5 tests) 2ms
✓ utils/__tests__/teamHelpers.test.ts (6 tests) 2ms
✓ lib/comparisons/__tests__/store.test.ts (9 tests) 3ms
✓ lib/__tests__/useRanking.test.ts (5 tests) 2ms

Test Files  5 passed (5)
     Tests  29 passed (29)
  Duration  569ms
```
**PASS**

### `npm run build`
```
✓ Compiled successfully in 1626ms
⚡ [DEFENSE] Served 32 teams from ESPN standings (2026)
⚡ [OFFENSE] Served 32 teams from ESPN (2026)
⚡ [OFFENSE] Processed 32 teams via ESPN: 402ms
⚡ [DEFENSE-AGG] Aggregated 48 games (skipped 0), 32 teams.
   CONSISTENCY total=31636/31636 (MATCH) pass=20890/20890 (MATCH) rush=10746/10746 (MATCH)
⚡ [DEFENSE] Enriched yards-allowed for 32/32 teams
✓ Generating static pages (14/14)
```
**PASS** — all 14 routes rendered, 32 teams served, data consistency confirmed.

---

## Token confirmation — `--card` and siblings all intact

```
--bg:         #0a0e1a   (page background)
--surface:    #111827
--card:       #1a2235   ← confirmed #1a2235 (NOT oklch)
--border:     #2a3450
--gold:       #d4a843
--gold-bright:#f5c842
--green:      #22c55e
--fire:       #ff6b35
--red:        #ef4444
--blue:       #3b82f6
--muted:      #6b7280
--text:       #f1f5f9
--subtext:    #94a3b8
--radius-sm:  6px
--radius-md:  10px
--radius-lg:  14px
--radius-xl:  20px
--shadow-card: 0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6)
--shadow-pop:  0 12px 40px -8px rgba(0,0,0,0.7)
--nav-pill-h: 40px
--nav-h:      60px
```

No oklch values. No `--background`/`--foreground`/`--primary` shadcn vars. No `.dark` block.

---

## HUMAN VISUAL-QA CHECKLIST

Cannot be verified here (no browser). A person must eyeball the following after pulling this branch:

- [ ] **Dark mode everywhere** — no white flashes, no light backgrounds. Check `/`, `/compare`,
  `/standings`, `/leaderboards`.
- [ ] **393px mobile width** — the primary target. DevTools responsive or iPhone. Check the
  Compare quadrant view, the bottom nav pill, team selectors, the metrics drawer.
- [ ] **Compare quadrant** — four panels load, stat bars render (inward, green ↔ fire), rank
  badges show, the quadrant close-tab (×) works.
- [ ] **`backdrop-blur-xs` vs old `backdrop-blur-sm`** — the codemod renamed these. Blur on
  dropdowns/popovers should look correct. If too subtle, this is the first thing to check.
- [ ] **`rounded-sm` vs old `rounded`** — bare `rounded` (4px) became `rounded-sm` (2px in v4).
  Small chip/button corners may look slightly sharper. Check the metrics chips and toggle pills.
- [ ] **`bg-linear-to-br` gradient backgrounds** — the homepage gradient background and any
  gradient overlays in `MobileCompareLayout`. Should look identical.
- [ ] **`focus:outline-hidden`** — interactive elements should have NO outline when clicked,
  still show on keyboard nav (`:focus-visible`). Check a dropdown on keyboard.
- [ ] **Touch-optimized class** — on iOS / mobile emulation: no tap highlight on buttons,
  correct touch-action, no text selection in app mode.
- [ ] **Standings, Leaderboards pages** — load cleanly, no layout shifts.
- [ ] **Schedule home** — ticker marquee animates, matchup cards render.

---

## Not done / risks / follow-ups

- **Full `@theme` token port deferred.** `tailwind.config.js` is still CommonJS loaded via
  `@config`. This works (v4 compat mode) but is not the idiomatic v4 approach. A future task
  can port all `theme.extend` values to `@theme { ... }` in `globals.css` and drop the config
  file. Not needed for correctness now.
- **iOS WKWebView compatibility.** Tailwind v4 uses modern CSS features (e.g., `color-mix`,
  cascade layers, `@property`). WKWebView on iOS 16.4+ supports these; iOS < 16.4 may have
  gaps. The app targets iOS 16+ — verify on a physical device or simulator at 16.4 before
  shipping to TestFlight. The 16.0–16.3 window is the risk window.
- **`@tailwindcss/typography` version.** Still at `^0.5.19`. Works in compat mode. A future
  upgrade to `^0.5.16`+ with `@plugin "@tailwindcss/typography"` is the cleaner v4 path.
- **`critters` CSS inlining.** Still in devDeps; Next 15 uses it for critical CSS. No issues
  observed, but watch for any build warnings in future Next upgrades.
- **NOT pushed / NOT merged / NOT deployed.** Branch `tailwind-v4` is local only. Human must
  QA → squash-merge or PR-merge to `main` after visual confirmation.

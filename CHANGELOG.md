# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

### Fixed
- **Home peek: no dead space above "Open full"** (2026-10-06, `main`) — the inline variant no longer inherits the Compare page's bottom-nav reserve (`MobileCompareLayout` `padBottom` → 8px for `inline`); "Open full" is now a gold neon capsule matching the nav's `ActivePill`.
- **Schedule odds no longer stay blank for a whole session** (2026-10-06, `main`)
  - See: `docs/devnotes/2026-10-06-schedule-odds-freshness.md`.
  - Loaded weeks older than 5 min are quietly re-fetched (in-view week ±1) when they scroll into view or the app returns to the foreground — lines ESPN posts after a week loaded now appear without a reload. Merge never erases a line or rewinds a live game (`lib/scheduleRefresh.ts` + tests).
  - `public/sw.js` is now a kill switch: devices that installed the old PWA service worker drop its `pare-*` caches and unregister it (it served `/api/*` from cache first with no max age). Old worker → `_to-delete/2026-10-06-sw-pwa-cache/`.
- **Odds stay on current-week finals; Compare pills show live/final scores** (2026-10-05, branch `feat/favorites`)
  - See: `docs/devnotes/2026-10-05-favorites-your-teams.md` ("Bundled fixes").
  - The live poll no longer erases the server's closing line when ESPN drops odds on a final (`odds: l.odds ?? m.odds` in `ScheduleProvider.patchLiveMatchups`).
  - Compare preset pills show scores for live + final games (`IND 24 · 17 WAS`, loser dimmed on finals).
  - Live-score poll moved from `ScheduleScreen` into the layout-mounted `ScheduleProvider`, so pills keep updating while you're on Compare (same single poll, no extra network).
- **Standings: never blank, never hangs, refreshes when you come back** (2026-10-04, `main`)
  - See: `docs/devnotes/2026-10-04-standings-freshness.md`. Audit kept the live model (every visit = fresh ESPN, measured TTFB 0.22s with ESPN ≈ 0.19s) — no cache added.
  - ESPN standings now time out after 5s; on an error, timeout or partial payload the page serves the last good standings instead of empty boxes (new `liveWithLastGood()` in `lib/apiCache.ts`, same backup-only pattern as the offense/defense routes). Empty boxes only if the server has never had good data.
  - New `useRefreshOnReturn` hook: returning to the app/tab after 60s+ quietly re-renders Standings with fresh data (`router.refresh()` — keeps the chosen view and scroll, no skeleton). Covers the PWA sitting in the background while a game ends.
  - Data shape, sort/tiebreak order and the page structure unchanged. Tests: `apiCache.test.ts`, `refreshOnReturn.test.ts` (76 total).
  - Performance audit (sandbox, 4× CPU, median of 3): LCP 0.56s, view switch 83–131ms tap→paint, scroll 60 fps / 0 dropped, ~1% idle CPU, 0 running animations on iPhone 14 Pro + iPad portrait/landscape → no perf fixes needed. Table in the dev note.

### Changed
- **Header toggles match the bottom nav — one "glass toggle" recipe** (2026-10-06, `main`)
  - Standings Division/Conf/Playoffs, Fantasy TOT/PPG and the Leaders jump capsule now use the nav's sliding gold pill (new `components/ui/ActivePill.tsx`, framer `layoutId` spring 420/34, static glow, `will-change: transform`, reduced motion → instant) and its label styles (new `components/ui/glassControl.tsx`: 500 inactive → 700 active, `GlassLabel` reserves the bold width so neighbours don't shift). BottomNav uses the same two pieces; its look, sizing and `'nav-active-pill'` are unchanged.
  - New token `--glass-off` (#737a88) for inactive labels on every glass toggle, nav included: 4.70:1 on `--nav-bg` (nav's `--muted` was 4.2:1 — failed AA at 12px; headers' `--subtext` was 7.9:1 but brighter than the nav).
  - JumpNav: a tapped link stays lit until the next manual scroll (wheel/touch/key), so a short section near the bottom can't make the pill slide twice. Scroll-follow logic otherwise unchanged; the pill moves only when the section changes.
  - Recipe: `docs/design-system.md` §9 rule 7 (+ §8 Nav, §9.2, §9.3).
- **Leaders R3 "edge-to-edge" + freshness fix + perf audit** (2026-10-06, branch `ui/leaders-neon-frame`, on top of `786cdf6`)
  - Look (picked on "Pare Leaders Redesign v2"): rows pushed to the card edges (32px, `14px · 30px · 1fr · auto`, rank right-aligned 11px, #1 gold), short names "J. Smith-Njigba" (`lib/playerName.ts`, full name on hover/VoiceOver via `title`), 12px page gutter + 8px gaps, plain FANTASY header with a TOT/PPG toggle (no sticky bar), 44px "All 25" button (the open card spans both columns on iPhone), header jump capsule **FAN · OFF · DEF · ST · R** whose gold ring follows the section you're reading. ESPN legacy abbrs (WSH/JAC/LA) now get their team color. Recipe: `docs/design-system.md` §9.3.
  - `CardGrid` (shared): `maxCols` is now really enforced (Leaders packed 6 across at 1194px), `auto-fill` keeps card widths equal in short sections, `align-items: start` so an open card doesn't stretch its row. Standings layout verified unchanged at 393/834/1194.
  - Freshness: leaders update within ~40 min of ESPN (was up to ~6h). ESPN boards, rookie scans and Sleeper stats sit in `unstable_cache` for 30 min over no-store fetches with timeouts; a failed/empty/reshaped/hung response keeps the previous data (cached copy, then in-memory last-good) instead of blanking the board — also across a restart. Sleeper player map no longer caches `{}` for 24h. Page `revalidate` 21600 → 300 (what it really was). `RefreshOnReturn`: coming back after 10+ min refreshes the data.
  - Perf (sandbox, 4× CPU, median of 3): LCP 0.25–0.29s, expand 50–56ms, TOT/PPG ~40ms, 60 fps / 0 dropped, ~2ms main-thread per 5s idle, 0 animations → no fixes needed. Details in the dev note.

### Added
- **Site footer + /about page** (2026-10-06, branch `chore/footer-about`)
  - See: `docs/devnotes/2026-10-06-footer-about.md`.
  - `components/SiteFooter.tsx` at the end of each tab's scroll content (Home, Standings, Leaders, About): ≥1024px full footer (wordmark + tagline, Pare / Company columns, © line + "not affiliated" disclaimer); below that a one-line "© {year} Pare LLC · About". Legal column hidden until Privacy/Terms exist. Not on Compare (no-scroll fit screen).
  - `app/about/page.tsx`: H1 Inline shell + one deep card (Pare LLC, support@pare.gg, data disclaimer). Static.
  - Hidden in the iOS app: `lib/platform.ts` inline script sets `<html data-app="ios">` from the wrapper UA (`Pare-iOS`) before paint; CSS hides `.site-footer`. No `headers()` — `/`, `/leaderboards`, `/about` stay static/ISR.
- **Logos off by default** (2026-10-06, `main`, `4be957d`) — `config/teamIdentity.ts` `default: 'name'`.
- **Swipe down to close bottom sheets + favorites logos** (2026-10-06, branch `ui/sheets-favorites-logos`)
  - See: `docs/devnotes/2026-10-06-sheets-swipe-favorites-logos.md`.
  - New shared `components/ui/BottomSheet.tsx`: every bottom sheet (team quick menu from Standings, the Home "Your teams" picker) now closes by swiping it down, as well as tapping outside. The picker drags from its top area so the team grid still scrolls.
  - "Manage order & display" moved to the top of the Your teams picker.
  - Logos on the favorites team chips (Home picker + first launch) and on /teams (your teams + add-search results) — new `favorites` surface in `config/teamIdentity.ts`.
- **Team logos are back — logo ⇄ name switch** (2026-10-06, `ui/team-logo-switch` → `main` `1e527eb`; quick-menu logo `fc2ec58` on `ui/nav-styles`)
  - See: `docs/devnotes/2026-10-06-team-logo-switch.md`.
  - **Switch:** `config/teamIdentity.ts` → `default: 'logo' | 'name'` + per-surface `overrides` (`home`, `compareMenus`, `comparePills`, `compareHero`, `standings`, `leaders`, `teamMenu`). `default: 'name'` turns every logo off.
  - **Where:** Home cards, Compare team picker + rank dropdown + week pills, Standings (all 3 views — logo **plus** team-color abbreviation), the team quick-menu sheet (logo by the city + nickname), Leaders (stat, fantasy incl. D/ST, rookies). Compare hero (and the Home inline compare) stays on the nickname wordmarks via `compareHero: 'name'`.
  - **How:** new `components/ui/TeamIdentity.tsx` wraps each surface's existing abbreviation markup and returns it untouched in name mode → flipping back is pixel-identical. Logo mode = local SVG in a fixed box sized to the old slot (no layout shift), lazy + async decode, full team name for screen readers. Standings TEAM column widens (64 → 92px floor) only in logo mode.
  - Dark logos (Raiders, Colts, Giants, Jaguars, Commanders, Bears, Texans, Broncos, Cowboys, Rams, Packers, Bills) get a thin light edge (`--logo-halo`).
  - **Licensing:** NFL logos are trademarks — accepted risk pre-monetization; `default` must be `'name'` before ads / Pro (design-system §9 rule 4).
  - Unused `components/TeamLogo.tsx` → `_to-delete/2026-10-06-team-logo-legacy/`. Tests: `teamIdentity.test.ts` (117 total); vitest now uses the automatic JSX runtime so it can render components to a string.
- **Favorites — "Your teams"** (2026-10-05, branch `feat/favorites`)
  - See: `docs/devnotes/2026-10-05-favorites-your-teams.md`. Picked on the "Pare Favorites" board (look A2, all 5 setup entry points).
  - Pick up to 3 favorite teams (saved on the device, `pare:favorites`). On Home their games move into a "★ Your teams" group at the top of each week, with a team-color star by the abbreviation and an outer team-color aura on that side of the card (static, no animation). Current week shows a "Pick your teams" prompt until you pick.
  - Set favorites from: first-launch screen (once), Home header star sheet, Compare team picker star (favorites listed first), Standings row quick menu (Add to Your teams / Compare vs…), and the new `/teams` screen (reorder, remove, Pin + Glow switches).
  - Files: new `lib/favorites/store.ts` (+ tests), `components/FavoritesProvider.tsx`, `components/favorites/*`, `app/teams/page.tsx`; edits to `app/layout.tsx`, `MatchupCard`, `WeekSection`, `ScheduleScreen`, `CompactTeamSelector`, `StandingsRow`.
- **Leaders "Neon Frame" + Rookie leaderboards** (2026-10-06, branch `ui/leaders-neon-frame`)
  - See: `docs/devnotes/2026-10-06-leaders-neon-frame-rookies.md`, recipe in `docs/design-system.md` §9.3. Picked on the "Pare Rookie Leaders" board (Round 3 option 1 "Standings match" + two spacing tweaks).
  - Leaders now uses the Standings look: deep page, H1 header, gold section rules, deep list cards with tight 32px rows (rank · team-color abbr · name · value), gold tint on #1, glass Total/PPG toggle. ESPN team logos removed. 2 cards across on iPhone, 4 on iPad portrait, 5 landscape. No entrance/expand animations.
  - New **Rookies** block under Special Teams: Rookie Offense / Defense / Special Teams — the same 12 stat boards filtered to first-year players (Sleeper `years_exp = 0` matched to ESPN by id or normalized name + team — Sleeper rarely has rookies' ESPN ids; ESPN list scanned 300 deep, cached 6h as the trimmed result). Empty rookie boards hide.
  - Files: `app/leaderboards/page.tsx`, `components/leaderboards/{LeaderCard,FantasyBoards}.tsx`, new `components/leaderboards/grid.ts`, `lib/leaders.ts`, `lib/fantasy.ts`, new `lib/rookieMatch.ts` (+ `lib/__tests__/rookieMatch.test.ts`). Main boards' data, sort and caching unchanged.
- **Standings "Neon Frame" — compact rows + playoff seeds** (2026-10-04, branch `ui/standings-neon-frame`, merged to `main` at `56ddf86`)
  - See: `docs/devnotes/2026-10-04-standings-neon-frame.md`, recipe in `docs/design-system.md` §9.2. Picked over three mockup rounds ("Pare Standings Redesign": C + ESPN columns · L2 · T2 · Hc → V5 Dense + quiet points → R2 Standards-fixed).
  - New header toggle **Division / Conf / Playoffs**: division cards, a 16-team conference list by seed with a playoff line, and an "if the season ended today" playoff picture (seeds 1–7, Wild Card round, in the hunt).
  - Deploy: standard Mac mini flow (pull → install → clean → build → `pm2 restart pare`); verify with `/api/health` commit and `"seed"` values in `/api/standings`.
  - Seed chips from ESPN `playoffSeed` (new `seed` field in `lib/standings.ts`); team logos removed → 13px team-color abbreviations lifted to 4.5:1 where needed; ESPN columns W · L · PCT · PF · PA · STRK with PF/PA and losing streaks in secondary grey; gold leader tint; T column only when a tie exists league-wide; 32px static rows; toggle buttons get a 44px hit area.
- **Home "Neon Frame" — Frame Row game cards** (2026-10-03, branch `ui/home-neon-frame`)
  - See: `docs/devnotes/2026-10-03-home-neon-frame.md`, recipe in `docs/design-system.md` §9 / §9.1. Picked from two mockup rounds ("Pare Home Redesign": A + H1 + D1, G1 · C2 · N3 · 24px).
  - Game cards: team logos removed → 24px solid team-color abbreviations + nickname/record; 1.5px team-color frame with a subtle side glow (same palettes + clash swaps as Compare); live games get a red pulsing dot; final games: winner score white, loser dimmed to grey; scores in fixed symmetric slots with the betting line on two short lines (spread / O/U) so it never crowds them (live scores stay white).
  - Home page on `--bg-deep`; header bar + week stepper restyled as a glass capsule (new `--glass-edge` token, also used by the bottom nav); week list uses the shared neon menu look; day labels gold-bright with hairline rules; skeleton, empty state, inline peek container and box score on deep surfaces.
  - Removed the unused `eslint-disable` in `ScheduleScreen.tsx`. Data, schedule logic, live polling and hook signatures untouched.
- **Compare "Neon Frame" redesign — Round 5 R + Round 4 K gold nav** (2026-10-02, branch `ui/compare-neon-frame`)
  - See: `docs/devnotes/2026-10-02-compare-neon-frame.md`, rules in `docs/design-system.md` §8.
  - Split-capsule neon bars in each team's own color (lift / clash / fallback rules, `lib/teamColors.ts`); rank-tier effects (#1 gold ring + sparks, #2–5 soft breathe, #28–31 static red badge outline, #32 ember badge). Brighter card side glows (Round 5 S strength); inactive comparison tabs show their team colors dimmed.
  - Team-name wordmarks replace logos on Compare; neon-frame cards; deep Compare background; Offense + Defense fit one iPhone 14 Pro screen in app mode.
  - Bottom nav active tab = sliding gold neon outline (same size). Bar math, ranking, data layer untouched.
  - Team picker + rank-badge dropdowns restyled (shared `components/ui/neonMenu.ts`): 40px rows, height grows with the screen, logos replaced by `TeamMark` (2–3 letter wordmark). New-comparison picker + tablet "Add comparison" cell match (dashed gold slots, team-color frame when filled).
  - Blank comparison: text removed, slots moved up, and **this week's games as one-tap pills** ("IND vs WAS") that fill both teams; an already-open pair jumps to its tab instead of duplicating (`lib/comparisons/useFillComparison.ts`).
  - Close × on comparison tabs / iPad cards is soft gold and always shown — closing the last one leaves a blank "pick 2 teams" tab (a lone blank tab hides its ×).
  - **Power Surge:** a team ranked top 5 in ≥ 3 of a card's metrics gets a subtle storm-crackle effect (team-color plasma web + random edge flares) on its half, fading to the middle (`lib/powerSurge.ts`, `lib/usePowerSurge.ts`, `components/ui/StormCrackle.tsx`). Chosen from the Power Surge / Storm Crackle labs (option B·9).
  - Week pills use plain white text instead of the small outlined TeamMark (easier to read); design-system §8 gains type-role rules (outlined display text only at 20px+). Pills also show kickoff day/time under the teams (live clock in red, "Final" after).
  - **Background ladder "C":** Compare background lifted from near-black #030409 to deep navy-slate #0a0d14 with cards one step lighter and a new `--nav-bg` token (darkest layer) for the bottom nav — all tokens in `globals.css`; team-color contrast re-checked against the new background (`COMPARE_BG`).
  - **Design system §9 "Global rules":** Neon Frame becomes the app-wide standard (surface ladder, type roles, gold accent, no logos, where team color/glow is allowed, card types, motion, process); undecided patterns for Home/Standings/Leaders marked "TBD (mockup first)".

### Performance
- **Compare tab Pass 1 — smoother team swaps, rank menus, swipes** (2026-10-03, branch `perf/compare-pass1`)
  - See: `docs/devnotes/2026-10-03-compare-performance.md` (all four passes, method, results).
  - Audit: project doc `claude/perf-audit-compare-2026-10-03.md` (iPhone 14 Pro viewport, 4x CPU throttle, median of 3).
  - Stat numbers are plain text (removed `@number-flow/react` — its roll forced ~375ms of layout per team swap).
  - Rank-badge menus mount only while open (were 20 hidden Floating UI menus per pane); stable toggle/close handlers so opening one menu re-renders one row, not all.
  - One app-wide stats copy (`components/NflStatsProvider.tsx`) shared by Home + Compare — opening Compare no longer refetches or flashes the skeleton; background refresh on return to the app after 10 min (keeps old numbers on screen / on error).
  - Result (emulated): team swap 12→40 fps, tap→done 977→368ms; rank swap worst freeze 583→167ms; swipe 40→48 fps, worst frame 250→83ms; Home→Compare 0 API calls.
- **Compare tab Pass 2 + 3 — effects play on change, then settle** (2026-10-03, branch `perf/compare-pass2`)
  - Tier effects (bar aura breathe, #1 sparks, #32 ember, meeting-point flare) run a short finite burst on mount / team swap / PG↔TOT, then hold a still glow — nothing on Compare loops forever. Aura stays hidden while the bar slides so its blur isn't redrawn each spring frame (`SplitCapsuleBar` `effectKey`, `RankBadge` keyed by team).
  - Power Surge canvas plays 4 s, fades, leaves the still glow and stops its frame loop.
  - Menus: plain dim instead of a full-screen backdrop blur; row stagger moved from 33 framer animations to one CSS class (`.pare-row-in`).
  - Swipe: the next neighbor pane mounts after the slide lands (inside `startTransition`), not mid-swipe.
  - `useIsMobile` reads the width with `useSyncExternalStore` — Compare no longer builds the iPad 2×2 grid first and throws it away on phones.
  - Design system §8/§9 motion rules updated (play on change → settle; no full-screen blur over animating content).
  - Result (emulated, vs Pass 1): resting screen 55→60 fps with main-thread work 2041→363ms per 3s; team swap 42→49 fps, tap→done 388→271ms; menu open 32→45 fps; swipe 48→54 fps, worst frame 117→50ms, zero long tasks.
- **Compare tab Pass 4 — fixes from the real-iPhone Safari recording** (2026-10-03, branch `perf/compare-pass4`)
  - Recording showed Safari repainting the whole card area ~7×/s for ~5 s after every change (effect window), ~50–100ms per frame; idle afterwards was clean (~2.5% CPU).
  - Every animated effect now sits on its own GPU layer (`will-change` on `.pare-breathe*`, `.pare-spark`, ember); #32 ember pulses an `::after` opacity instead of animating box-shadow; bar meeting-point divider made static (Kobe OK'd); stat rows get `contain: layout`.
  - Bottom nav: removed the backdrop blur — the nav is 94% opaque, so it was invisible (pixel diff max 2/255) but re-blurred the content under it every frame.
  - Sandbox (Chromium paint trace, 5 s after a team swap): repaints during seconds 2–5 of the effect window 120/s → 0; paint time 122 → ~60ms; raster 448 → ~330ms. FPS vs Pass 2: team swap 49→54, swap tap→done 271→239ms, rank swap 50→52, swipe 54→56.

### Fixed
- **"+" comparison tab now opens the new tab** (2026-10-02) — `ComparisonsProvider.addComparison` read the add result before React ran the state updater, so it logged a false "cap reached" and skipped `setActiveId`. Now activates inside the updater; cap answered from the committed list. Also fixes Home "Open full" + iPad "Add comparison".
- **Data freshness on self-hosted pare.gg** (2026-10-02, branch `fix/data-freshness`)
  - See: `docs/devnotes/2026-10-02-data-freshness.md`.
  - Compare offense/defense stats (and the W-L record on Compare) refresh every **10 min** instead of freezing for up to ~6h — the routes' 6h in-memory cache no longer sits in front of ISR (now a last-good backup only); `REVALIDATE_SECONDS` 3600 → 600.
  - Finished-game box scores cached per game for 24h (incomplete ones retried) — each refresh only downloads new finals instead of the whole season. Removed the outer `unstable_cache` that silently disabled nested caches.
  - Live scores now start polling on their own from 10 min before kickoff (`lib/liveWindow.ts`, unit-tested) — a page opened pre-game no longer stays frozen.
  - Corrected stale cache comments + added a **Data Freshness** table to `CLAUDE.md`.

### Changed
- **Phase 3 design token sweep — colors only** (2026-10-02, branch `tailwind-v4`)
  - See: `docs/devnotes/2026-10-02-token-sweep-phase3.md`.
  - Replaced every hardcoded color literal (hex, rgba) and raw Tailwind palette class (slate, green-500, orange-500, red-400, blue-600, amber, purple) with design tokens (`var(--token)` / `color-mix()` / tailwind.config.js mapped classes) across 28 files in `components/` and `app/`.
  - Added 8 new tokens to `globals.css :root`: `--green-deep`, `--fire-deep`, `--badge-gold`, `--badge-gold-deep`, `--badge-gold-text`, `--badge-red`, `--badge-red-deep`, `--badge-slate`.
  - 3 intentional visual shifts: (1) BottomNav active tab + DivisionTable leader row tint: gold-bright→gold token; (2) CompactComparisonRow stat text: `#fff`→`--text`; (3) CompactComparisonRow empty track: `white/5`→`--border`.
  - Excluded per spec: `TeamDropdown.tsx` (skip entirely), black/white-alpha shadows/overlays, `app/global-error.tsx` (globals.css not loaded), `OfflineStatusBanner.tsx` (amber semantic warning), purple install CTAs in `PWAInstallPrompt.tsx`.
  - All verification gates pass: `npm run lint` (0 errors), `npm run build` (14 pages). Committed directly on `main` (pushed).
- **Tailwind CSS v3 → v4 migration** (2026-10-01, branch `tailwind-v4`)
  - See: `docs/devnotes/2026-10-01-tailwind-v4-migration.md`.
  - Cleaned shadcn/tailwind-upgrade pollution from `main` (restored `app/globals.css`, `app/layout.tsx`, `package.json` from `origin/main`). Removed `components.json`, `components/ui/button.tsx`. Kept design-system token mapping in `tailwind.config.js`, `lib/utils.ts` cn(), and all component changes.
  - Ran `npx @tailwindcss/upgrade --yes` (stable 4.3.3): migrated `globals.css` to `@import 'tailwindcss'` + `@config` + `@utility` blocks; updated `postcss.config.mjs` to `@tailwindcss/postcss` (autoprefixer removed, bundled by v4); renamed utilities in 20 components (`flex-shrink-0`→`shrink-0`, `outline-none`→`outline-hidden`, `backdrop-blur-sm`→`backdrop-blur-xs`, `rounded`→`rounded-sm`, arbitrary min-h/w values to scale equivalents, gradient syntax).
  - Manual fixes: removed duplicate `addUtilities` plugin (`.touch-optimized`/`.focus-ring`) from `tailwind.config.js`; enhanced `@utility touch-optimized` with `-webkit-touch-callout`/`user-select` properties. All 21 dark tokens preserved exactly (`--card: #1a2235`, etc.). No shadcn/oklch vars.
  - All verification gates pass: `npm run check` (0 errors), `npm run test:run` (29/29), `npm run build` (32 teams served, 14 pages rendered). Fast-forward merged into `main` (pushed).

### Fixed
- **Audit Wave 3 — correctness, logging, hygiene + test harness** (2026-10-01)
  - See: `docs/devnotes/2026-10-01-audit-wave3-fixes.md`. Full audit: `docs/audits/2026-10-01-audit.md`.
  - **Ordinal bug:** ranks 21st/22nd/23rd/31st no longer render as "21th/22th/23th/31th" (shown in the ranking dropdown badge + list and in screen-reader text). Three divergent copies consolidated into one `utils/ordinal.ts` used by `useRanking`, `calculateBulkRanking`, and `RankBadge`.
  - **Prod logging:** removed the per-render `console.log` in `useTheme` (fired for every comparison row in production); `RankingDropdown` debug logs are now dev-only.
  - **Metric selector hygiene (`metricsConfig`):** the selector now only offers metrics the data layer actually populates (defense = the 5 allowed stats; offense = its ~16 live fields). Removed duplicate `penalties_yds` and ghost `penalty_first_down`. Side effect: closes the only path to the latent defense bar-inversion (no higher-is-better metric is selectable on defense).
  - **API error leakage:** `/api/nfl-2025/{offense,defense}` no longer return internal `message`/`errorType` to the client (still logged server-side).
  - **Minor:** `tailwind.config` typography plugin now `require(...)` (was `import(...)`, which never loaded it); deprecated `substr`→`slice`; manifest "real-time 2025 stats"→"real-time NFL stats"; documented the defense-swap assumption in `useBarCalculation`.
  - **Added — test harness + CI:** Vitest + first pure-logic unit tests (`utils/ordinal`, `utils/teamHelpers` [rewritten from the old console-log script], `utils/teamDataTransform`, `lib/comparisons/store`, `lib/useRanking` incl. ordinal/tie/special-team regressions) and `.github/workflows/ci.yml` (runs `check` + `test:run`). **One-time:** run `npm install` to add vitest + sync the lockfile, then commit `package-lock.json` (CI uses `npm ci`).

### Changed
- **Compare quadrants: edge close-tab + metrics locked to defaults** (2026-10-01)
  - See: `docs/devnotes/2026-10-01-quadrant-close-tab.md`.
  - Tablet/desktop quadrant view: removed the floating right-gutter control box. Close (×) is now a small bookmark tab fused to each card's right edge; panels fill the reclaimed width (uniform 6px band). The per-quadrant metrics (⚙) button was retired — quadrants show their default metric set (metric editing stays on phone / the workspace). `QuadrantMetricsButton.tsx` is now orphaned, pending removal.
- **Design system: drift audit + codified rules doc** (2026-10-01)
  - Added `docs/design-system.md` — living source of truth (supersedes the drifted `styleguide.md`): surface/elevation ladder + border/radius/accent/spacing rules, component recipes, a drift audit (worst offender `TeamDropdown.tsx`; token values hardcoded as literals in 6/8 sampled components; cards 12px `rounded-xl` vs the 14px `--radius-lg` token; two golds used as the active tint), a migration order, and tooling/library recommendations (CVA + tailwind-merge + clsx, shadcn/ui, Radix primitives, mapping tokens into `tailwind.config`).
  - **Phase 1 (foundation) started:** token `colors` + `boxShadow` added to `tailwind.config.js` (`bg-card`, `border-border`, `text-subtext`, `shadow-card`, `shadow-pop`, …) — purely additive, existing styles unchanged. Radius remap intentionally deferred (shifts corners app-wide — apply + eyeball). Phase 2 (CVA/shadcn/Radix) needs `npx shadcn init` + `npm i` on-device; Phase 3 component migration follows. Handoff + commands: `docs/devnotes/2026-10-02-design-system-phase1.md`.
- **Cleanup overhaul — dead-code removal, dedup, Leaders perf fix, rules draft** (2026-10-01)
  - See: `docs/devnotes/2026-10-01-cleanup-overhaul.md` (branch `cleanup/overhaul`, one commit per phase)
  - Removed the dead CSV/PFR data layer (`lib/pfr.ts`, `lib/pfrCsv.ts`, `data/pfr/`); data is ESPN + Sleeper only. Shared stat types consolidated into `lib/types.ts`.
  - Single canonical team-abbr resolver in `lib/teams.ts` (replaced 5 duplicated alias maps; every path now also handles `JAC`/`LA`, not just `WSH`).
  - Fixed the Leaders slowdown: Sleeper's ~20MB player map is no longer re-downloaded per request (module-level 24h in-memory cache of a trimmed map).
  - Added `typecheck` / `check` npm scripts; cleared 22/24 eslint warnings; dropped the unused `node-html-parser` dep (**run `npm install`** to sync the lockfile).
  - Proposed a lean consolidated `CLAUDE.md` at `docs/proposed/CLAUDE.lean.md` (current one has a stale-warning banner).

### Added
- **Compare: 2×2 quadrant layout (tablet/desktop) + spacing polish** (2026-10-01)
  - See: `docs/devnotes/2026-10-01-compare-quadrants.md`
  - **Quadrant view** on tablet/desktop (≥768px): up to four comparisons at once in a
    2×2 grid, each its own Offense+Defense pane, still swipeable (paging between sets of
    four). Phone keeps the single-pane swipe. `components/compare/CompareQuadrants.tsx` +
    `components/compare/QuadrantMetricsButton.tsx` (per-quadrant ⚙ metrics modal);
    `CompareWorkspace.tsx` branches on `useIsMobile(768)`; `ComparePane.tsx` /
    `MobileCompareLayout.tsx` gained a `quadrant` variant.
  - **Per-quadrant × / ⚙ controls** as a vertical box floating in a reserved right gap.
    Centering gotcha fixed by wrapping content + box in an inner `relative` div so the box
    centers to the content, not the grid-stretched card.
  - **Uniform 6px dark-blue band** around the quadrant body (left/top/bottom/between
    panels + both sides of the control box); panels widened to fill most of the card.
- **Team records, Standings tab, broadcast networks, responsive CardGrid** (2026-09-30)
  - See: `docs/devnotes/2026-09-30-records-standings-networks-cardgrid.md`
  - **Team W–L–T records** on Home cards (from the ESPN scoreboard payload, no extra
    fetch) and under each team on the Compare panels (from the ESPN standings data
    already fetched for defense). `'record'` added to the per-game transform skip list.
  - **New Standings tab** (4th nav tab): `lib/standings.ts` + `app/api/standings`
    + `app/standings/page.tsx` + `components/standings/DivisionTable.tsx`.
    AFC/NFC → four divisions (North/South/East/West), ESPN-style columns
    (W/L/T/PCT/PF/PA/STRK). Teams kept in ESPN's official NFL tiebreaker order
    (no manual point-diff sort). Last-good in-memory fallback on ESPN hiccups.
    `conference`/`division` added to all 32 teams in `lib/teams.ts`.
  - **Broadcast network** shown next to kickoff time on Home cards (from the
    scoreboard payload; "Prime Video" → "Prime"; text label, not logos — trademark).
  - **`components/ui/CardGrid.tsx`** — shared responsive card wall (CSS `auto-fit`,
    min/max card width, `maxCols` cap, centered partial rows). House standard for
    card grids. Standings = 4 per row (one row per conference), Leaders = up to 5.

### Performance
- **Data caching — Batch 3 (Next.js Data Cache + unstable_cache, no more cold aggregation)** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-perf-batch3.md`
  - `REVALIDATE_SECONDS: 3600` added to `config/constants.ts` as the single
    tunable for the Next.js Data Cache window (all ESPN fetches + aggregation).
  - Removed all `cache: 'no-store'` from `lib/espnStats.ts` (3 fetch sites: team
    stats, standings, scoreboard/summary); replaced with `next: { revalidate: REVALIDATE_SECONDS }`.
    Results are now persisted in Vercel's Data Cache across serverless invocations.
  - Wrapped `fetchDefenseYardsAllowed` in `unstable_cache` (tag `defense-yards-allowed`,
    key includes season). The entire computed aggregation (80+ ESPN summary fetches
    → `Record<string, YardsAllowed>`) is cached as a single JSON blob; only the
    Map reconstruction runs on cache hits. Public signature unchanged.
  - `export const revalidate = 3600` added to `app/api/nfl-2025/offense/route.ts`
    and `app/api/nfl-2025/defense/route.ts` — build table shows both routes as
    `○ Static · Revalidate: 1h, Expire: 1y`, confirming Vercel pre-renders and
    serves them without running the handler on cold requests.
  - `/api/schedule` stays `ƒ Dynamic` (reads `week` query param); fetch-level
    `next.revalidate` in `lib/schedule.ts` already handled caching there.
  - `lib/schedule.ts` hardcoded `3600` tied to `APP_CONSTANTS.CACHE.REVALIDATE_SECONDS`.
  - Verification: build exit 0; no `cache:'no-store'` remains; defense endpoint
    responds 38ms / 35ms on first/second curl (no re-aggregation). REVALIDATE = 3600s.
- **Compare render-path perf — Batch 2 (pane windowing + memo + stable handlers)** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-perf-batch2.md`
  - `#3` Windowing: `CompareWorkspace` now mounts only the active pane and its
    immediate neighbors (active ±1); panes ≥2 away render as empty same-width cells
    (track layout + drag constraints preserved). Neighbors stay mounted so a swipe
    reveals a ready page with no blank flash. Non-adjacent tab taps snap instantly
    (avoids sliding the track past unmounted cells); adjacent moves still spring.
  - Wrapped in `React.memo`: `ComparePane`, `OffensePanel`, `DefensePanel`,
    `CompactPanel`, `MobileCompareLayout`, `DynamicComparisonRow`,
    `CompactComparisonRow`. To make the row memo effective, per-team transforms
    (`transformTeamData`) are now memoized in the panels, and `CompactPanel`'s
    team-change handlers are `useCallback`-stable.
  - Stabilized the handlers passed to each pane: a per-comparison-id handler cache
    (`getPaneHandlers`) reads `updateComparison` through a ref, so handler identity
    never changes → memoized panes don't re-render on unrelated `setActive`.
  - No displayed values / behavior changed (distant panes' transient local display
    mode resets on remount — inherent to virtualization). `npm run build` clean.
  - Deferred to next batch: `#1` data caching.
- **Compare render-path perf — Batch 1 (logs, ranking memo, transform memo)** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-perf-batch1.md`
  - `#4` Gated hot-path diagnostic logs behind `process.env.NODE_ENV !== 'production'`
    (`useRanking`, `useDisplayMode`, `OffensePanel`/`DefensePanel`,
    `DynamicComparisonRow`, `CompareWorkspace`, and the `useNflStats` fetch hooks —
    `console.error` kept). Removes hundreds of synchronous console calls per swipe.
  - `#2` `useRanking` now depends on the primitive options (`higherIsBetter`,
    `excludeSpecialTeams`) instead of the caller's fresh `options` object literal,
    so its `useMemo` is actually effective (was recomputing every render → also
    cascaded through `useBarCalculation`).
  - `#5` Wrapped `transformAllData(...)` results in `useMemo` (keyed by
    `[transformAllData, data]`) in `OffensePanel`, `DefensePanel`, and
    `CompactPanel` so per-game math over all 32 teams no longer re-runs every render.
  - Pure perf/logging — no displayed values or behavior changed. `npm run build` clean.
  - Deferred to later batches: `#1` data caching, `#3` pane windowing/memo.

### Fixed
- **Production build — ESLint errors blocking `next build`** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-build-eslint-fixes.md`
  - `components/mobile/CompactComparisonRow.tsx`: moved `useRanking`/`useBarCalculation`
    ABOVE the early return so hooks run unconditionally in a stable order
    (rules-of-hooks); logic/values guarded instead of skipping the calls. Render
    output unchanged.
  - Replaced `any` with proper types / `unknown` + narrowing (no blind casts):
    `FloatingMetricsButton.tsx` (idle-callback + `visualViewport`),
    `RankingDropdown.tsx` (`visualViewport`), `lib/metricsSelectorPreload.ts`
    (typed dynamic-import module), `lib/useOfflineStatus.ts` (Network Information
    API), `lib/usePWA.ts` (iOS `navigator.standalone`).
  - `components/OfflineStatusBanner.tsx`: escaped the apostrophe (`&apos;`).
  - Installed missing `critters` dep (required by `experimental.optimizeCss`) —
    a latent prerender blocker exposed once ESLint passed; behavior preserved.
  - `npm run build` now completes with NO errors (warnings only).
- **Home schedule card — scores/odds in center, tighter layout** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-schedule-card-scores-odds.md`
  - `Matchup` extended with `state`/`completed`/`statusDetail`/`awayScore`/
    `homeScore`/`winner`/`odds`, parsed from the ESPN scoreboard we already fetch
    (`status.type`, `competitors[].score`/`winner`, `odds[0].details`/`overUnder`).
  - `MatchupCard` layout: abbreviations on the outer edges, each score just inboard,
    status-driven center — upcoming shows day/time + `<spread> · O/U <total>` (omitted
    gracefully when no odds); final shows both scores (winner highlighted) + "Final";
    live shows scores + short status.
  - Per request: kept the expand chevron (not removed) and tightened the card
    (smaller logos/gaps/padding) so scores + odds fit and still look good.
  - `tsc --noEmit` + `eslint` clean; verified against live ESPN (our parser):
    completed games → final scores + winner; upcoming → spread + O/U; no-odds omit.
- **Compare create flow — "+" on tab row + blank-tab inline team pick** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-blank-tab-team-pick.md`
  - Removed the standalone "+" from the Home header entirely.
  - The "+" now lives at the FAR RIGHT of the compare tab row (larger, gold, easy
    thumb tap; disabled at `MAX_COMPARISONS`).
  - Tapping "+" no longer opens a bottom sheet: it `addComparison('', '')` (a BLANK
    tab, labeled "New") and activates it. The blank tab renders a new
    `BlankComparePicker` empty state — two "Pick team" slots that open a COMPACT
    INLINE DROPDOWN anchored at the slot (reuses `CompactTeamSelector`, the same
    Floating-UI team list from the panel headers). Filling both renders the
    comparison normally.
  - Removed the old drawer/sheet picker (`NewComparisonButton` deleted).
  - Workspace validation now repairs only STALE (non-empty invalid) team names —
    empty teams stay blank so the "+" empty state persists until picked.
  - `tsc --noEmit` + `eslint` clean on changed files.
- **Visual refinements — floating pill nav + compare reorder** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-visual-refinements.md`
  - `BottomNav` restyled into a floating, centered rounded capsule (blur backdrop,
    soft shadow, side margins, floats above the bottom edge) — still the SAME
    single persistent instance mounted once in `app/layout.tsx` (no behavior
    change). New `--nav-pill-h` token; `--nav-h` (reserved footprint) 64 → 76px.
  - Compare screen reordered: shared title row (back + "Compare" + the "+" new-
    comparison button, now shown on Compare too) → comparison-tabs pill → cards.
    The per-pane `MobileTopBar` was removed (workspace now owns the single header;
    file deleted). Swipe/tab behavior unchanged.
  - `tsc --noEmit` + `eslint` clean on changed files.

### Added
- **Persist comparisons across sessions — localStorage (Vision Step 6)** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-comparisons-persistence.md`
  - New client-only `lib/comparisons/persist.ts` (key `pare:comparisons`, schema
    `version: 1`): `loadComparisons(max)` / `saveComparisons()`, all `window`-guarded
    + try/catch. Corrupt/old/missing → seed cleanly; trims to `MAX_COMPARISONS`
    and repairs a dangling `activeId`.
  - `ComparisonsProvider` hydrates **post-mount** (initial state = seed on server
    + first client render → no hydration mismatch), exposes a `hydrated` flag, and
    **persists on any change (debounced 150ms)**, gated on `hydrated`.
  - Deep link now waits for hydration then opens the matchup on top of restored
    tabs (dedupe/`setActive` or `addComparison`) — deep link wins for active.
  - `tsc --noEmit` + `eslint` clean on changed files.
- **Persistent bottom nav — Home ↔ Compare (Vision Step 5)** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-persistent-bottom-nav.md`
  - New `components/BottomNav.tsx` mounted **once** in `app/layout.tsx` (shell
    level, outside every route and outside the compare swipe container) so it
    never unmounts/re-animates on navigation or tab swipes. Active state from
    `usePathname`; fixed + iOS safe-area aware (new `--nav-h` token).
  - Unified the duplicate footer: removed the per-pane `MobileBottomBar` from
    `MobileCompareLayout` and **deleted** it. Content reserves nav height
    (`CompareWorkspace` root padding, Home `main` padding).
  - `tsc --noEmit` + `eslint` clean on changed files.
- **Home accordion → inline compare + "Open full" (Vision Step 4)** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-home-accordion.md`
  - Schedule rows are now accordions: tap to expand an inline head-to-head peek
    (Framer Motion height animation) rendering the SAME Compare component via a
    new `ComparePane inline` / `MobileCompareLayout variant="inline"` (panels
    only) — editable in place, single-open (only one row at a time).
  - The peek uses an **ephemeral local draft** (teams seeded from the matchup),
    not added to `comparisons[]` just by expanding. Stats fetched **once** in
    `ScheduleBoard` (`useNflStats`) and shared to all rows — instant expand.
  - **"Open full"** promotes to a tab: dedupes to an existing tab for the same
    (unordered) pair (`setActive`, carrying inline edits) or `addComparison`
    (respecting `MAX_COMPARISONS`), then navigates to `/compare`.
  - New `components/schedule/MatchupAccordion.tsx`; `MatchupCard` is now the
    tappable header (button + chevron). No duplicate compare UI or data hooks.
  - `tsc --noEmit` + `eslint` clean on changed files.
- **"+" create-comparison flow (Vision Step 3)** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-plus-create-flow.md`
  - Top-right "+" on the Home header (`components/compare/NewComparisonButton.tsx`,
    styled like the week stepper) → bottom-sheet picker with two existing
    `<TeamSelector>`s fed from `NFL_TEAMS` (no new picker/registry) → on confirm
    `addComparison(teamA, teamB)` + `setActive` + navigate to `/compare` so it
    opens as its own tab.
  - Respects `MAX_COMPARISONS`: "+" disabled/greyed at the cap (`addComparison`
    also returns `null` as a backstop). Cancel / overlay / Escape = no change;
    Compare disabled until two different teams are chosen.
  - `tsc --noEmit` + `eslint` clean on changed files.
- **Compare workspace shell — swipeable tabs (Vision Step 2)** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-compare-workspace-shell.md`
  - `/compare` is now a **swipeable multi-comparison workspace** driven by the
    Step-1 store: one page per comparison, swipe/tab to change `activeId`, each
    tab closable (`removeComparison`), active-close reassigns to a neighbor,
    last-close keeps one seeded default.
  - New `components/compare/`: `CompareWorkspace` (Framer Motion pager +
    tab bar + shared data), `ComparePane` (reusable per-comparison Compare UI,
    extracted from the old page — no logic changes), `CompareTabBar`
    (`ABBR · ABBR` chips, gold active, `×` close, `+` affordance wired for Step 3).
  - **No refetch on swipe:** `useNflStats()` runs once in the workspace; panes
    read shared data via props. Single-compare behavior + `?home=&away=` deep
    link preserved. Ranking/bar math/panels untouched.
  - Minimal layout tweaks: `MobileCompareLayout` height `100dvh→100%`;
    `ComparePane` desktop background `fixed→absolute` (both for pager embedding).
  - `tsc --noEmit` + `eslint` clean on changed files.

### Changed
- **Comparisons collection store — Vision Step 1 (pure plumbing)** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-comparisons-store.md`,
    ADR `docs/adr/2026-09-14-comparisons-store.md`
  - New Context store `components/ComparisonsProvider.tsx` + `useComparisons()`
    (backed by pure, unit-tested logic in `lib/comparisons/store.ts`) holding
    `comparisons[]` + `activeId`. Mounted in `app/layout.tsx`.
  - `Comparison = { id, teamA, teamB, settings:{offenseMetrics,defenseMetrics} }`;
    `MAX_COMPARISONS=8` in `config/constants.ts`, enforced in `addComparison`.
  - `app/compare/page.tsx` now reads/writes the **active** comparison instead of
    local `useState` for team pair + metric selections. Deep link
    `?home=&away=` still sets the active teams. **No UI/behavior change** (one
    seeded default: Minnesota Vikings vs Detroit Lions).
  - Supersedes CLAUDE.md "global team state at ComparePage only, props-only" for
    comparison selection (see ADR). Data/ranking/bar-math/panels/schedule untouched.
  - `tsc --noEmit` + `eslint` clean on changed files.
- **RankBadge 3-tier system (dark mode)** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-rankbadge-tiers.md`
  - `components/ui/RankBadge.tsx`: tiers by rank across the ranked field —
    Top 5 GOLD (#1 filled "crown" w/ glow, 2–5 gold outline), middle SLATE
    (neutral outline), bottom 5 RED (worst filled w/ glow, others red outline).
    Consistent pill shape/size; unranked → neutral "—".
  - Proper ordinal helper (1st/2nd/3rd/21st/31st/32nd — no more "31th").
    Tie-aware (tied teams share rank → same tier). Bottom-5 based on the **actual
    ranked count** (`totalTeams`, may be <32 while loading), threaded from the
    dropdown's ranking data — no ranking-math or data-layer changes.
  - Sanity (n=32): 1→gold crown, 2/5→gold, 6/15/27→slate, 28/31→red, 32→red worst.
  - `npm run lint` clean on changed files (`RankBadge.tsx`,
    `CompactRankingDropdown.tsx`).

### Fixed
- **Offense yards now NET (match defense-allowed) + Week-1/18 arrows** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-net-yards-and-week-arrow.md`
  - **Fix A**: offense mapping switched `total_yards ← netTotalYards` and
    `pass_yds ← netPassingYards` (were gross `totalYards`/`passingYards`, which
    include sack yardage). Confirmed `gross − net = sackYardsLost` (GB: 34).
    Rushing unchanged; defense untouched. GB offense now 419/353/66 = Vikings'
    allowed; HOU=BUF-allowed, NE=SEA-allowed. League consistency exact:
    total 10094/10094, pass 6524/6524, rush 3570/3570. `DATA_SOURCES.md` mapping
    table updated to NET.
  - **Fix B**: week stepper `‹`/`›` are now unambiguously disabled at the bounds
    (native `disabled` + `onClick` gated + `pointer-events:none` + `not-allowed`
    cursor + greyed) — no tap/active feedback at Week 1 (‹) or Week 18 (›).

### Changed
- **Default metric: Sc% → 3rd-down %, live for 2026** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-third-down-swap.md`
  - `lib/metricsConfig.ts`: `DEFAULT_OFFENSE_METRICS` + `DEFAULT_DEFENSE_METRICS`
    now use `third_down_pct` instead of `score_pct` (Sc% stays defined/available,
    just not a default). Ranking context unchanged (offense higher = better;
    defense inverts → lower opponent % = better).
  - **Offense (direct)**: `third_down_pct ← thirdDownConvPct` from the Step-2
    team-statistics feed (miscellaneous category).
  - **Defense (aggregated)**: extended the Step-4 game-summary loop to also read
    each opponent's `thirdDownEff` ("conv-att"); attempts-weighted
    `Σopp conv / Σopp att × 100` (not a per-game average).
  - **Acceptance gate (live 2026)**: MIN offense `53.333%` (≈53.3 ✓); MIN defense
    `25%` (lone opponent GB 3/12 ✓). Offense populated 32/32, defense 30/32
    (DEN/KC unplayed → "—"). `npm run lint` clean on changed files.
- **DEFENSE yards-allowed via opponent-aggregation (2026)** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-espn-defense-yards.md`
  - **Opponent aggregation**: `lib/espnStats.ts` → `fetchDefenseYardsAllowed()`
    loops completed regular-season games (scoreboard `STATUS_FINAL`), pulls each
    game's box score (`summary` endpoint), and sums each team's OPPONENTS'
    offensive yards → total / net-pass / rush yards allowed. Summaries fetched in
    parallel batches of 8; a failing game is skipped (logged), not fatal.
  - **Defense route enriched**: `app/api/nfl-2025/defense/route.ts` merges the
    aggregated yards onto the Step-3 points/`g` rows (best-effort — if aggregation
    fails the yards stay "—"). Cached in the existing 6h cache; not recomputed per
    request.
  - **Fills the Step-3 "—"**: `total_yards`, `pass_yds`, `rush_yds` now populated
    for every team with ≥1 completed game. Teams that haven't played yet (Week-1
    MNF: DEN, KC) stay "—" — real, not a bug.
  - **Internal consistency check** (no external source): Σ yards allowed === Σ
    yards gained across all box scores — total 10094/10094, pass 6524/6524, rush
    3570/3570 (all MATCH). Bills allowed 381/257/124 = their lone opponent (HOU)
    offense.
  - Offense, schedule, and Step-3 points-allowed untouched. `npm run lint` clean
    on changed files.
  - Follow-up: `pass_yds` here is ESPN **net** passing (box score), while the
    offense endpoint reports **gross** — fine within each panel; noted for later.
- **Live DEFENSE points-allowed from ESPN standings (2026)** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-espn-defense-points.md`
  - **Standings fetch**: `lib/espnStats.ts` → `fetchDefenseStatsFromESPN()` reads
    ESPN's standings tree for `SEASON`, mapping each team's `pointsAgainst` →
    `points` and `wins+losses+ties` → `g`. All other defense "allowed" metrics are
    intentionally left off the row (yards-allowed is Step 4).
  - **Defense route switched**: `app/api/nfl-2025/defense/route.ts` now serves live
    2026 points-allowed (was 2025 CSV). It **no longer reads the CSV** — avoids
    mixing 2026 points with stale 2025 yards. Resilience: standings fail → stale
    cache → (no cache) 32 empty (—) rows. `X-Source` header reports the path.
  - **Graceful "—" render**: `CompactComparisonRow` (mobile) + `DynamicComparisonRow`
    /`RankingDropdown` (desktop) now show `—` for unpopulated metrics (no fake `0`),
    hide the comparison bars, and suppress the rank badge. This also cleans up the
    offense `score_pct` cell (now `—` until the Sc% step).
  - **Ranking correctness preserved**: defense still ranks fewest points allowed =
    best (existing panel invert logic untouched).
  - Verified: defense `rows.length` = 32, `season` = 2026; points match ESPN
    standings (BAL 23, BUF 31, PHI 22, DET 30) with `g` matching; compare defense
    panel shows real points + ranks and `—` for yards (browser); offense + schedule
    untouched; standings-failure simulation → `EMPTY-FALLBACK`, no crash.
  - Follow-up: yards-allowed (total/pass/rush) is still a gap — Step 4.
- **2026 season switch + live OFFENSE stats from ESPN** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-espn-offense-2026.md`
  - **Season constant**: `APP_CONSTANTS.SEASON = 2026` in `config/constants.ts` —
    single source of truth for the season year (no scattered literals).
  - **ESPN team IDs**: added `espnId` to every team in `lib/teams.ts` (ESPN
    franchise id map from `DATA_SOURCES.md`) so we can loop all 32 by id.
  - **Live offense fetch**: `lib/espnStats.ts` → `fetchOffenseStatsFromESPN()`
    pulls season-TOTAL offense stats for all 32 teams in parallel from ESPN's
    core stats endpoint and maps them into the existing `TeamStats` shape
    (values as strings). Ranking / display-mode / bar hooks + UI untouched.
  - **Offense route switched**: `app/api/nfl-2025/offense/route.ts` now serves
    ESPN 2026 data (was 2025 CSV). Resilience: ESPN fail → stale cache →
    (no cache) 2025 offense CSV fallback. `X-Source` header reports the path.
  - **Defense untouched**: `defense/route.ts` still reads the 2025 CSV as before.
  - Verified: offense `rows.length` = 32, `season` = 2026; Bills totals match ESPN
    (36 pts / 420 total / 334 pass / 86 rush, 1 game); CSV fallback exercised via a
    bad-URL simulation (no crash). Small numbers are real — early 2026 season.
  - Follow-ups (noted in devnote): map `score_pct` (Sc% has no clean ESPN source —
    shows `0.0%` for now, no crash); wire live DEFENSE (yards-allowed gap); rename
    the `nfl-2025` route folder (cosmetic, later).
- **Schedule-first home + Sleeper-style UI pass** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-schedule-first-redesign.md`
  - **New entry point**: `app/page.tsx` rewritten from API-docs marketing page into
    a mobile-first schedule of the current NFL week — compact tappable matchup
    cards grouped by day, with loading (skeleton), empty, and error states.
  - **Data seam**: `lib/schedule.ts` exports `getCurrentWeekMatchups()` returning
    a typed `Matchup[]` (currently a hardcoded 16-game mock, all 32 teams). Real
    source can drop in behind the function without UI changes.
  - **Team registry**: `lib/teams.ts` — single source for abbr ↔ full-name ↔
    location/nickname, used by the schedule, cards, and compare query params.
  - **Deep-link preload**: `/compare?away=XXX&home=YYY` preloads both teams into
    the existing global selection (away→Team A, home→Team B). Wrapped in `Suspense`
    for `useSearchParams` (Next 15). No new state store.
  - **Components**: `components/schedule/{MatchupCard,ScheduleList,MatchupCardSkeleton}.tsx`,
    `components/ui/RankBadge.tsx` (custom tiered rank badge, top-3 filled gold).
  - **Design system**: loaded Inter via `next/font` (was referenced but never
    loaded); added radius/elevation tokens, `.skeleton` shimmer + `.no-scrollbar`
    utilities to `globals.css`; wired the Inter var into `tailwind.config.js`.
  - **Motion**: Framer Motion for card entrance/tap feedback and spring-animated
    theScore inward bars in `CompactComparisonRow` (proportional meeting point
    preserved — 2% center gap, rounded outer ends).
  - **No emoji in UI**: replaced bottom-bar + avg-team emoji with lucide icons
    (`CalendarDays`, `GitCompareArrows`, `Settings`, `BarChart3`, `ChevronLeft`/
    `ChevronRight`) and the custom `RankBadge`. `MobileTopBar` now shows a back-to-
    schedule affordance + current matchup; `MobileBottomBar` "Schedule" tab links home.
  - Verified: home → tap matchup → compare preloaded → back nav, at phone + desktop
    widths (browser screenshots).
  - Follow-up: swap schedule mock for a live source; bring desktop compare shell
    fully onto the new token system (still uses the older gradient/purple styling).

### Fixed
- **Mobile Styleguide Retheme** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-mobile-layout-fundamentals.md` (Part 2)
  - Applied global design system from `styleguide.md` to all 7 mobile components
  - Color palette: steel-blue/purple → gold/dark-navy sports-app (`--bg` #0a0e1a, `--card` #1a2235, `--gold` #f5c842)
  - CSS variables added to `globals.css` as `:root` block (single source of truth)
  - `MobileTopBar`: "NFL" now gold section label, surface bg, `--border` divider
  - `MobileBottomBar`: Compare tab = gold active, Stats/Settings = muted inactive
  - `CompactPanelHeader`: OFFENSE/DEFENSE gold section labels; PG|TOT dual toggle (both always visible; gold = active, muted = inactive)
  - `CompactComparisonRow`: **Ordinal suffix fixed** (21st/22nd/23rd not 21th); bars = `#22c55e` green + `#ff6b35` fire, no glow
  - `CompactRankingDropdown` + `CompactTeamSelector`: gold rank badges, `--card` bg, `--border` dividers, gold selected dot — all purple removed
  - Self-checked: browser screenshots confirmed layout, toggle, dropdown, ordinals, panel independence

- **Mobile Layout Fundamentals** (2026-09-14)
  - See: `docs/devnotes/2026-09-14-mobile-layout-fundamentals.md`
  - Removed broken `@/debug/traceDropdown` imports from 4 mobile components (build blocker from deleted file)
  - Replaced `position: fixed` bars + `calc()` padding anti-pattern with `flex flex-col h-[100dvh]` flex-column layout
  - Content area: `flex-1 overflow-y-auto min-h-0` — no pixel math, scroll works on all devices
  - `MobileTopBar` + `MobileBottomBar`: changed from `fixed` to `flex-none`, safe-area insets preserved
  - `CompactPanelHeader`: `grid-cols-[44px_1fr_44px]` for guaranteed pixel-perfect centering
  - `CompactComparisonRow`: removed `mb-2` gaps, `grid-cols-[1fr_auto_1fr]` balanced layout, `tabular-nums` on values
  - `CompactPanel`: `divide-y divide-white/5` for tight theScore-style row separators
  - `DEFAULT_DEFENSE_METRICS`: restored to 8-metric intended design (was copy-paste of offense); defense now shows Turnovers, Interceptions, Scoring %, Turnover %

### Changed
- **Repo Janitor Pass** (cleanup, no code touched)
  - Repo `CLAUDE.md` rewritten: ~1000 → ~470 lines. Removed 8 documented stale facts (wrong port 3000→4000, ghost RankingDropdown issue, dead refs to `PROJECT_PLAN.md` / `Mobile_plan.md`, obsolete Phase 1 Swift bootstrap samples, Q1 2025 launch date, etc.). Now points to vault as master brain doc.
  - Vault brain doc created: `D:\Programs\Obsidian\Vault\Me\Projects\Pare\CLAUDE.md` (lean, BatterBot-style, ~85 lines).
  - Master Active Projects table updated: Pare row added.
  - `docs/` consolidated: empty folders (`audit/`, `archive/`, `specs/`, `port/`) and root `debug/` swept into `docs/_to-delete/`.
  - `public/` cleaned: 5 unused `create-next-app` boilerplate SVGs (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`) moved to `_to-delete/`.
  - `data/pfr/` cleaned: raw `.html` scrape duplicates moved to `_to-delete/`.
  - `debug/` root folder: `rankingDebug.ts` and `traceDropdown.ts` verified unused, moved to `_to-delete/`.
  - `.gitignore` updated: added `ios/**/Preview Content/`, removed dead `/oldproject.md` rule.
  - **Action required:** delete `docs/_to-delete/` via Windows Explorer when confident nothing valuable is in it.

### Added
- **iOS Wrapper Scaffold** (2025-10-14) ✅ PHASE C COMPLETE
  - **Complete iOS Project**: `/ios/` directory with full SwiftUI + WKWebView implementation
  - **20 Swift Files**: Models, App, Web, UI/Tabs, UI/Common layers
  - **Key Components**:
    - `PareApp.swift` - Main app entry with AppCoordinator
    - `WebViewContainer.swift` - WKWebView wrapper with pull-to-refresh, progress, external links
    - `WebViewModel.swift` - WebView state management (similar to React hooks)
    - `PareBridge.swift` - JavaScript bridge for iOS ↔ Web communication
    - `PareTabView.swift` - Bottom tab bar (Home, Settings, Debug)
    - `SettingsTab.swift` - Native environment switcher, cache controls
    - `DebugTab.swift` - Development tools, navigation controls
    - `ProgressBar.swift` - Loading progress indicator
  - **XcodeGen Configuration**: `project.yml` with Debug/Release schemes
  - **Build Configs**: `Debug.xcconfig` (port 4000), `Release.xcconfig` (prod URL)
  - **Info.plist**: ATS configured for localhost (Debug) and HTTPS (Release)
  - **Assets**: AppIcon.appiconset, AccentColor.colorset (purple brand color)
  - **Scripts**: `gen_xcode.sh`, `setup.sh` with first-time setup automation
  - **Total Files Created**: 30+ files across 10 directories
  - **Features**: Pull-to-refresh, progress bar, back/forward gestures, external link handling, cache management, environment switching
  - **Next**: Run `ios/Scripts/setup.sh` to generate Xcode project and start development

### Docs
- **iOS Runbook** (2025-10-14) ✅ COMPLETE
  - Created: `docs/mobile/IOS_RUNBOOK.md` (600+ lines)
  - **Quick Start**: First-time setup, prerequisites, development workflow
  - **Testing**: Complete checklist for basic, web integration, iOS features, edge cases
  - **Troubleshooting**: 10+ common issues with solutions (server not running, localhost unreachable, build errors, crashes, etc.)
  - **Console Output**: Expected logs, error diagnosis
  - **Performance Tips**: Build time, runtime, app size optimization
  - **Advanced Topics**: JS bridge usage, custom URL schemes, push notifications
  - **Physical Device**: Setup instructions, local network configuration
  - **Maintenance**: Update dependencies, clean up backups

- **iOS Wrapper Plan** (2025-10-14) ✅ PHASE B COMPLETE
  - Created: `docs/mobile/IOS_WRAPPER_PLAN.md` (600+ lines)
  - **Architecture**: SwiftUI + WKWebView + XcodeGen
  - **Bottom Tabs**: Home (WebView), Settings (Native), Debug (Native)
  - **Features**: Pull-to-refresh, progress bar, external links → Safari, photo upload support, JS bridge
  - **XcodeGen**: project.yml with Debug/Release schemes, deterministic generation
  - **ATS**: localhost allowed in Debug, HTTPS required in Release
  - **Config**: Debug.xcconfig (port 4000), Release.xcconfig (prod URL)
  - **File Layout**: 20 Swift files, modular structure (App/, Web/, UI/, Models/)
  - **Decision**: ✅ PROCEED_WITH_IOS_SCAFFOLD = true
  - **Next**: Phase C - Scaffold iOS Project

- **iOS Foundation Audit** (2025-10-14) ✅ PHASE A COMPLETE
  - Created: `docs/mobile/AUDIT_iOS_FOUNDATION.md` (500+ lines)
  - **Verdict**: ✅ Excellent candidate for iOS WKWebView wrapper
  - **Strengths**: Zero external dependencies, port 4000 ready, mobile-first design, iOS-friendly PWA
  - **Repo Analysis**: Next.js 15 App Router, React 19, TypeScript, 32 NFL logos, 8 mobile components
  - **Network Surface**: All same-origin (CSV → API routes → Frontend), no external hosts
  - **PWA/Cache**: Service worker excludes HTML precaching (perfect for iOS)
  - **Assets**: Has 192x192 icon, needs 1024x1024 for iOS AppIcon
  - **Risks**: None critical, minor cleanup needed (ios-backup folders)
  - **Next**: Phase B - iOS Wrapper Plan

### Fixed
- **Swift Compilation Errors** (2025-10-10) ✅ COMPLETE
  - Fixed: `StatsViewModel.swift` - Added missing `import Combine`
  - Fixed: `ContentView.swift` - Corrected preview block syntax
  - **Issue 1**: ObservableObject conformance required Combine import
  - **Issue 2**: Preview blocks used explicit return statements (not allowed in ViewBuilder)
  - **Issue 3**: Preview blocks tried to access private @StateObject
  - **Result**: All 10 Xcode build errors resolved
  - Status: ✅ Project now compiles successfully

### Added
- **Monorepo Reorganization** (2025-10-10) ✅ COMPLETE
  - Created: `docs/devnotes/2025-10-10-monorepo-reorganization.md`
  - **Action**: Consolidated iOS project into monorepo structure
  - **From**: Split between `/Pare-iOS/` and `/Pare/ios/`
  - **To**: All in `/Pare/ios/` (professional monorepo)
  - **Moved**: Pare-iOS.xcodeproj → Pare/ios/Pare.xcodeproj
  - **Organized**: Proper folder structure (Models, Services, ViewModels, Views)
  - **Preserved**: All Swift files, Config.xcconfig, Info.plist, Assets
  - **Next**: Open Pare.xcodeproj and fix file references in Xcode

### Docs
- **Comprehensive Session Summary** (2025-10-10) ✅ COMPLETE
  - Created: `SESSION_SUMMARY_2025-10-10.md` (900+ lines)
  - **Purpose**: Complete context for continuing work with fresh Claude instance
  - **Coverage**: All work completed, files created/modified, current state, next steps
  - **Sections**: Project context, work completed, files created, current state, key decisions, next steps, testing, commands, React→Swift patterns, success criteria
  - **Use**: Provide to Claude on desktop to continue seamlessly
  - **Status**: Ready for context window transfer

### Added
- **Swift API Client & Data Models** (2025-10-10) ✅ COMPLETE
  - Created: `Pare-iOS/Pare/Models/TeamData.swift` - Data structures (Codable)
  - Created: `Pare-iOS/Pare/Services/StatsAPI.swift` - API client with async/await
  - Created: `Pare-iOS/Pare/Services/CacheManager.swift` - 6-hour cache manager
  - Created: `Pare-iOS/Pare/ViewModels/StatsViewModel.swift` - State management
  - Updated: `Pare-iOS/Pare/ContentView.swift` - Test UI with team list
  - Created: `Pare-iOS/SWIFT_FILES_SETUP.md` - Step-by-step setup guide
  - **Features**: Health check, offense/defense fetch, caching, error handling
  - **React Equivalent**: Like useNflStats hook + TypeScript interfaces
  - **Status**: ✅ Ready to add to Xcode project
  - **Next**: Add files to Xcode, test data loading, build comparison UI

- **Xcode Project Configuration Files** (2025-10-10) ✅ COMPLETE
  - Created: `Pare-iOS/Config.xcconfig` - App configuration (like .env for iOS)
  - Created: `Pare-iOS/Info.plist` - Complete with ATS, dark mode, bundle settings
  - Created: `Pare-iOS/XCODE_SETUP_GUIDE.md` - Beginner-friendly setup instructions
  - **Config.xcconfig**: API base URL (port 4000), version numbers, feature flags
  - **Info.plist**: Dark mode forced, localhost networking enabled, bundle ID configured
  - **Setup Guide**: Step-by-step Xcode instructions with React → Swift comparisons
  - Status: ✅ Ready to add to Xcode project
  - Next: Add files to Xcode, configure project settings, test configuration

- **Port 4000 Migration** (2025-10-10) ✅ COMPLETE
  - Updated: `package.json` - Dev server now runs on port 4000 (`-p 4000`)
  - Updated: `config/constants.ts` - Added PORT: 4000 to API config
  - Updated: `MOBILE_NOTES.md` - All examples use port 4000
  - **Why**: iOS ContentView.swift already hardcoded to port 4000
  - **Consistency**: Backend, docs, and iOS all use same port
  - **Test**: `npm run dev` → `curl http://localhost:4000/api/health | jq`

- **API Health Endpoint for iOS** (2025-10-10) ✅ COMPLETE
  - Created: `app/api/health/route.ts`
  - Returns: `{ ok: true, version: "1.0.0", timestamp, uptime, endpoints, environment }`
  - Purpose: iOS App Store compliance + production monitoring
  - Status: ✅ Ready (restart dev server to activate)
  - Test: `curl http://localhost:4000/api/health | jq`

### Docs
- **API Audit for iOS Development** (2025-10-10) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-10-api-audit.md`
  - See: `MOBILE_NOTES.md` (iOS API documentation)
  - **Purpose**: Pre-iOS development API readiness assessment
  - **Coverage**: All 3 existing endpoints + error handling + caching + data sources
  - **Status**: ⚠️ 99% Ready (missing HTTPS production URL)
  - **Key Findings**:
    - ✅ 3 working endpoints (offense, defense, preferences)
    - ✅ Excellent 6-hour in-memory caching with stale data fallback
    - ✅ Comprehensive error handling (200 OK with stale flag, or 500 with details)
    - ✅ Clean codebase (zero TODO/FIXME/HACK comments)
    - ✅ Consistent JSON response format across all endpoints
    - ❌ Missing `/api/health` endpoint → CREATED ✅
    - ⚠️ No HTTPS production URL (required for iOS ATS compliance)
  - **Deliverables**:
    - Complete API audit report with status codes, response formats, cache strategies
    - MOBILE_NOTES.md with iOS-specific documentation and Swift code examples
    - `/api/health` endpoint implementation
    - iOS readiness checklist (score: 9.5/10 after health endpoint)
  - **Swift Examples**: Complete `StatsAPI` client with cache management, error handling, retry logic
  - **Deployment**: Recommends Vercel for free HTTPS (zero config, automatic SSL)
  - **Next**: Deploy to HTTPS production, then begin Phase 1 (iOS Project Bootstrap)

- **Mobile Components Deep Dive** (2025-10-10) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-10-mobile-components-audit.md`
  - **Purpose**: Surgical analysis of 9 mobile components for SwiftUI conversion
  - **Focus**: State management, dropdown behavior, interaction patterns
  - **Key Findings**:
    - Two distinct dropdowns: Team selector (alphabetical) + Ranking dropdown (rank-sorted)
    - Mutual exclusion pattern: Only one dropdown open at a time per panel
    - Floating UI positioning: Professional portal-based rendering with auto-flip
    - Instant display toggle: No dropdown, immediate mode switch
    - Two-line row layout: Data line (padded) + bar line (edge-to-edge)
  - **Detailed Flows**: 3 complete user interaction flows with visual examples
  - **Dropdown Management**: Full documentation of positioning strategy and state control
  - **SwiftUI Mappings**: Component-by-component conversion patterns
  - **Next**: Phase 1 - iOS Project Bootstrap (create SwiftUI versions)

- **Comprehensive iOS Conversion Audit** (2025-10-10) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-10-ios-conversion-audit.md`
  - **Purpose**: Pre-iOS conversion analysis of entire codebase
  - **Coverage**: 17 desktop components, 9 mobile components, 5 hooks, 44+ metrics
  - **Deliverables**: Component tree, data flow diagrams, SwiftUI mappings, iOS checklist
  - **Key Findings**:
    - Clean modular architecture translates exceptionally well to iOS
    - Zero external state libraries = easy SwiftUI conversion
    - Client-side calculations = reusable Swift functions
    - Estimated 3-4 weeks to App Store v1.0
  - **Swift Patterns**: Provided SwiftUI code examples for all major patterns
  - **iOS Checklist**: 6-phase roadmap with gate questions for each phase
  - **Next**: Phase 0 - iOS Foundations (repo hygiene, MOBILE_NOTES.md, /health endpoint)

### Fixed
- **Critical: Per-Game Ranking Precision Fix** (2025-10-09) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-09-hooks-alignment-audit.md`
  - See: `docs/audits/2025-10-cross-surface-hooks/findings.md`
  - **Issue**: `.toFixed(1)` was rounding values BEFORE ranking computation
  - **Root Cause**: `utils/teamDataTransform.ts:54` converted per-game values to strings (e.g., 38.888 → "38.9")
  - **Impact**: Broke tie detection in per-game mode - Vikings showed "15th" instead of "T-13th"
  - **Fix**: Removed `.toFixed(1)` from data transform layer
  - **Result**: Full precision preserved for ranking, formatting only at display layer
  - Affects both desktop AND mobile (shared bug)
  - No other code changes needed (display components already format correctly)
  - Per-game and Total modes now have identical tie detection precision
- **Mobile Dropdown Positioning - Floating UI Migration** (2025-10-09) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-09-floating-ui-migration.md`
  - See: `docs/devnotes/2025-10-09-floating-ui-bugfix.md` (React setState fix)
  - See: `docs/audits/2025-10-09-mobile-dropdown-audit.md`
  - **Issue #1 Fixed**: Dropdowns no longer clipped by panel divider/overflow-hidden
  - **Issue #2 Fixed**: Right-side (Team B) dropdowns stay within viewport  
  - **Issue #3 Fixed**: Bottom row dropdowns auto-flip to render above when needed
  - **Positioning Enhancement**: Smart side positioning - Team A dropdowns appear RIGHT, Team B dropdowns appear LEFT
  - **Height Fix**: Shows 8-9 complete rows (416-468px) instead of 5.38 rows - no more mid-row cutoff (San Francisco issue)
  - Migrated from manual absolute positioning to industry-standard **Floating UI** library
  - Professional solution used by GitHub, Stripe, Vercel, Linear, Notion
  - Added `@floating-ui/react` dependency (~10KB gzipped)
  - Portal-based rendering escapes clipping containers
  - Auto-flip, shift, and boundary detection middleware
  - Works flawlessly across all screen sizes (320px-428px+)
  - Handles device rotation, scroll, resize automatically
  - Mobile touch-optimized with accessibility built-in
  - Production-ready for iOS App Store deployment

### Added
- **Mobile UI Transformation - Phase 4: Final Polish & Testing** (2025-10-09) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-09-phase4-final-polish.md`
  - Added touch-optimized CSS utilities (`.touch-optimized`, `.focus-ring`)
  - Comprehensive testing across viewport sizes (320px - 1024px)
  - Verified all dropdowns, interactions, and state management
  - Visual consistency audit (spacing, colors, typography)
  - Performance verification (60fps scrolling, instant interactions)
  - Complete mobile UI architecture documentation
  - Production-ready mobile comparison interface
  - **MOBILE TRANSFORMATION COMPLETE**: 9 new components, ~1,200 lines
  - theScore's structure + Pare's style = Perfect balance

- **Mobile UI Transformation - Phase 3: Team Logo Dropdown Integration** (2025-10-09) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-09-phase3-team-logo-selector.md`
  - Implemented `CompactTeamSelector` dropdown (alphabetical team list)
  - Responsive height: clamp(320px, 50vh, 420px)
  - Tap team logo → Opens team selector with all 32 teams + "Avg" last
  - Purple accents, Pare styling, average team emoji badge
  - Added state management for team selector dropdowns (separate from ranking)
  - Mutual exclusion: Only one dropdown open at a time per panel
  - Complete team selection flow: Logo → Dropdown → Select → Update global state

- **Mobile UI Transformation - Phase 2: Panel Headers & Comparison Rows** (2025-10-09) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-09-phase2-panel-rows.md`
  - Implemented `CompactPanelHeader` (70px height, instant PER GAME/TOTAL toggle)
  - Implemented `CompactComparisonRow` (two-line layout: data line + edge-to-edge bars)
    - LINE 1: Values, ranks, metric name (with padding)
    - LINE 2: Green/orange gradient bars (NO padding, touch panel edges)
    - Bar height: 6px with glow effects
    - Total row height: ~52px
  - Implemented `CompactRankingDropdown` (responsive height clamp(280px, 40vh, 380px))
  - Full integration with `useRanking`, `useBarCalculation`, `useDisplayMode` hooks
  - Tap rank text `(30th)` to open dropdown with all teams sorted by rank
  - theScore layout structure + Pare visual identity (green/orange bar colors from desktop)
  - Average team support (`📊 Avg` badge in dropdowns)
  - Fully functional comparison UI with real data

- **Mobile UI Transformation - Phase 1: Foundation & Shell** (2025-10-09) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-09-phase1-mobile-foundation.md`
  - Created `useIsMobile` hook for viewport detection (<1024px)
  - Created mobile component directory (`components/mobile/`)
  - Implemented `MobileCompareLayout` with conditional rendering
  - Implemented `MobileTopBar` (56px fixed, safe area padding)
  - Implemented `MobileBottomBar` (64px fixed, 3-tab placeholder)
  - Pare-styled background gradient and borders
  - Desktop layout preserved completely unchanged (≥1024px)

- **Special "Avg Tm/G" Team Support** (2025-10-08) ✅ ALL PHASES COMPLETE
  - See: `docs/devnotes/2025-10-08-avg-team-support.md`
  - **Phase 1**: Created utility functions (`utils/teamHelpers.ts`) for detecting league average special row
  - **Phase 2**: TeamDropdown shows "📊 Avg (per game)" as last option with visual separator
  - **Phase 3**: RankingDropdown shows "📊 Avg" badge (no rank number) after ranked teams (1-32)
  - **Phase 4**: Comparison view shows "📊 Avg" badge when average team selected (no rank pill)
  - **Fix #1**: RankingDropdown button shows "📊 Avg" when average selected (not "N/A")
  - **Fix #2**: "Avg" badge in comparison view is clickable (opens RankingDropdown)
  - Average team can be selected for benchmarking (e.g., "Cowboys 151 pts vs Avg 114.6 pts")
  - 32 teams still get ranks 1-32 (average excluded from ranking calculations)
  - Verified CSV contains "Avg Tm/G" row with per-game league averages

### Fixed
- **Service Worker CSS Caching** (2025-10-08)
  - See: `docs/devnotes/2025-10-08-sw-css-cache-fix.md`
  - Changed CSS caching from cache-first to network-first strategy
  - Fixes Tailwind class changes not applying on normal refresh (only after hard reload)
  - CSS now always fetches fresh, falls back to cache when offline
  - Bumped SW version to v1.0.6 to invalidate old caches
  - Added `npm run dev:clean` script for easy cache clearing

### Added
- Dev Note: Phases execution summary (2025-10-07)
  - See: `docs/devnotes/2025-10-07-phases-execution.md`

- MetricsSelector: Toggle metric selection by clicking bubbles (2025-10-02)
  - See: `docs/devnotes/2025-10-02-metrics-selector-ui-improvements.md`
  - Click selected metric to remove, click unselected to add
  - New "Add All / Clear All" button with dynamic label
  - Desktop responsive sizing improvements (md: breakpoints for larger text/grid/spacing)
- MetricsSelector: Full-width desktop layout & UX cleanup (2025-10-02)
  - See: `docs/devnotes/2025-10-02-metrics-fullwidth-cleanup.md`
  - Desktop panel now spans full width (responsive padding: 1rem→2rem→3rem)
  - Removed "Customize" button - metrics always visible for immediate interaction
  - Clean selected labels - removed redundant field keys (e.g., `1. Points` not `1. Points (points)`)
- MetricsSelector: 4-column desktop grid with improved density (2025-10-02)
  - See: `docs/devnotes/2025-10-02-metrics-4col-desktop-layout.md`
  - Desktop (≥1024px) now shows 4 columns instead of 3 (+33% metrics per row)
  - Reduced card padding and font sizes on desktop for better information density
  - Added min-height (105-120px) for consistent row alignment
  - Text clamping (1-line titles, 2-line descriptions) prevents overflow and maintains grid alignment
- MetricsSelector: 5-column ultra-wide grid & vertical expansion (2025-10-02)
  - See: `docs/devnotes/2025-10-02-metrics-5col-vertical-expansion.md`
  - Extra-large screens (≥1280px) now show 5 columns instead of 4 (+25% metrics per row)
  - Panel height expanded to 75% of viewport (leaving 25% gap from top for page context)
  - Scrollable area now fills available space (was fixed at 32rem/512px)
  - Combined improvements: +87% more metrics visible on modern widescreen displays

### Performance
- **Metrics Drawer Performance Optimization** (2025-10-03)
  - See: `docs/devnotes/2025-10-03-metrics-drawer-performance-audit.md`
  - First open: 150-200ms → <16ms (92% faster)
  - Animation: 30-40ms/frame → 10-15ms/frame (67% faster)
  - Eliminated spinner flash on first open (100% improvement)
  - Removed double backdrop-blur, added GPU layer hints (`will-change-transform`)
  - Changed scale animation to translate-only for better compositing
  - Professional 4-layer preload system (idle + interaction + hover + promise-gated)
  - Added singleton preload utility (`lib/metricsSelectorPreload.ts`)
  - Memoized MetricsSelector internal logic (`useMemo` + `useCallback`)
  - Wrapped FloatingMetricsButton in `React.memo` (50% fewer wasted re-renders)

### Fixed
- Increase RankingDropdown visible teams from 4 to 10+ (2025-10-02)
  - See: `docs/devnotes/2025-10-02-ranking-dropdown-height-increase.md`
  - Changed `max-h-60` (240px) to `max-h-[40rem]` (640px) in `components/RankingDropdown.tsx`

### Docs
- Add Dev Note for docs/release ops bootstrap (2025-10-02)
  - See: `docs/devnotes/2025-10-02-docs-release-ops-bootstrap.md`
  - Norms: `CLAUDE.md#changelog-guidelines`
- Add ADR template scaffold under `docs/adr/_template.md` (2025-10-02)



# CLAUDE.md — Pare (repo technical reference)

> **Master brain doc lives in the vault:** `D:\Programs\Obsidian\Vault\Me\Projects\Pare\CLAUDE.md`
> — read it FIRST every session (identity, hard rules, current focus, protected files, paths).
> This file = technical reference for AI agents working inside the repo. Lean rewrite adopted
> 2026-10-02, synced with every dev note from 2026-10-01 → 2026-10-02.
>
> **Current state authority:** `CHANGELOG.md` (not this file). Deep references stay separate:
> `docs/design-system.md` (UI rules), `DATA_SOURCES.md` (ESPN/Sleeper endpoints),
> `VISION.md` (product), `docs/mobile/IOS_RUNBOOK.md` (iOS).

---

## What Pare is

NFL team head-to-head stat comparison app — "Sleeper-tier" quality bar, live at **https://pare.gg**.

- **Web:** Next.js 15.5 (App Router, Turbopack) + React 19 + TypeScript + **Tailwind v4** — production, port 4000
- **iOS:** SwiftUI + WKWebView wrapper — Phase C scaffold (see `docs/mobile/IOS_RUNBOOK.md`)
- **Signature visual:** theScore-style proportional inward bars
- **Audience:** everyday NFL fans first (later: bettors → fantasy → stat nerds)

## Standing rules (always apply)

- **Dark mode only. Mobile-first** — design at ~393px (iPhone 14 Pro, not Pro Max); tablet (iPad Pro 11") is an enhanced layout. No desktop priority. Width-based CSS only — no JS device detection for layout.
- **App shell:** header + footer nav stay fixed; only the content region scrolls. No full-page scroll, no pull-to-refresh bounce.
- **TypeScript strict, no `any`.** Typed props. Hooks hold logic; components render.
- **Design tokens only** — rules in `docs/design-system.md`, values in `app/globals.css :root`. Never hardcode a color/radius/shadow in a component. CI fails on raw Tailwind palette classes (`bg-slate-700`, …) in `app/` + `components/`.
- **Surgical over rebuild** — scoped, atomic changes; don't refactor unrelated code.
- **Don't touch the data layer, ranking / display-mode / bar math, or hook signatures** unless the task says so.
- **When Kobe reports an issue:** confirm the root cause with him first; edit code only after his go-ahead.
- **Cursor agents: no browser driving / screenshots to self-verify** — Kobe checks the UI himself. Cheap checks only (see Verification).

## Speak up before you build (applies to every request)

If anything Kobe asks for goes against standard practice or what an experienced pro would do, **stop and say so before implementing**. Never silently do it his way, and never silently "fix" it your way.

- **Flag format (short):** what's off-standard → why it matters (concrete risk) → recommended alternative → tradeoff → ask "my recommendation or your way?" and wait.
- **Loudness:** *Blocker* (security, data loss, licensing, breaks features, irreversible) → never proceed without his OK. *Strong* (readability, accessibility, performance, maintainability) → flag + recommend, wait. *Note* (minor judgment call) → one line, continue.
- **Check every area:** code quality + existing patterns · architecture (no over/under-engineering, one source of truth) · security (no secrets in code, validation, least privilege) · performance (phone battery/CPU, bundle, network) · UI/UX (readability — e.g. outlined text only at 20px+ — contrast, 44pt touch targets, reduced motion, design-system consistency) · licensing (logos, fonts, data APIs) · deploy/ops risk.
- **If he insists:** do it, and record the decision + reason (comment, dev note, or CHANGELOG) so it reads as deliberate.
- **Own misses:** if you knew and didn't say, say so plainly and fix it. Don't guess — verify (code, docs, tests) before claiming.
- **Answers:** concise; copy-paste commands (PowerShell 5: one per line, no `&&`); surgical fixes; code changes come with the key snippet + a short micro-learning + a small analogy.

## Data (ESPN + Sleeper — no CSV)

All live from free public APIs — **no** CSV/PFR layer (removed 2026-10-01). Endpoints + gotchas: `DATA_SOURCES.md`.

- **Schedule + live scores:** ESPN scoreboard (`lib/espnScoreboard.ts` mapper, `lib/schedule.ts`). Betting line kept for any game state; closing-odds fallback cached 6h.
- **Offense stats:** ESPN team statistics (`lib/espnStats.ts`). Yards are NET (`netPassingYards`/`netTotalYards`) so offense matches defense-allowed.
- **Defense:** points allowed via ESPN standings; yards + opponent 3rd-down % aggregated from final-game box scores (`lib/espnStats.ts`).
- **Standings:** `lib/standings.ts` (ESPN official tiebreak order).
- **Leaders:** ESPN byathlete (`lib/leaders.ts`); **fantasy (QB/RB/WR/TE/K/D-ST):** Sleeper (`lib/fantasy.ts`) — the ~20MB player map is fetched `no-store`, trimmed, and held in `unstable_cache` (24h).
- **Metrics:** `lib/metricsConfig.ts`. `availableInOffense/Defense` = only fields ESPN actually fills (AVAILABILITY CONVENTION comment; keep in sync with `espnStats.ts`). Defense exposes only *allowed* metrics (lower = better) — `useBarCalculation` swaps defense values on that assumption.
- **Licensing:** ESPN is unofficial/undocumented; Sleeper is non-commercial only. Licensed data provider required **before** any monetization (ads/Pro tier).

### Freshness (self-hosted, verified 2026-10-02 — see `docs/devnotes/2026-10-02-data-freshness.md`)

| Data | Refresh | Lag after ESPN |
|---|---|---|
| Live score / clock / final | browser polls ESPN every 15s while a game is live **or** 10 min before → 3h after kickoff (`lib/liveWindow.ts`) | ~15s |
| Standings | `no-store` + `force-dynamic` | instant |
| Home schedule + `/api/schedule` | fetch cache 5 min (`LIVE_REVALIDATE_SECONDS`) | ≤5 min |
| Compare offense/defense + W-L on Compare | route ISR + fetch cache 10 min (`REVALIDATE_SECONDS`) | ≤10 min |
| Final box scores (yards-allowed) | per-game `unstable_cache` 24h | new finals next refresh |
| Leaderboards | fetch cache 6h | ≤6h |

- **One timer per data type.** The offense/defense routes' in-memory copy is a *last-good backup* only (served on ESPN failure) — never in front of ISR.
- **Never nest** `unstable_cache` / cached `fetch` inside `unstable_cache` — Next silently bypasses nested caches.
- **Never judge prod freshness against `npm run dev`** (dev doesn't cache). Compare prod to prod: `curl.exe -sI https://pare.gg/<path>` → `cache-control`, `x-nextjs-cache`. Self-hosted ISR serves the old copy on the first hit after the window ("reload twice").
- Route-file `export const revalidate` must be a literal — keep `600` in sync with `REVALIDATE_SECONDS`.
- Planned: on-demand `revalidatePath()` endpoint pinged when a game goes final (stats within ~1–2 min).

## Architecture

- **Routes:** `/` schedule home (weekly matchups, accordion inline mini-compare, "Open full" → promotes to a Compare tab) · `/compare` workspace · `/standings` · `/leaderboards`. Persistent bottom nav (floating pill).
- **State:** a small React-context store, not props-from-page (ADR `docs/adr/2026-09-14-comparisons-store.md`):
  - `lib/comparisons/store.ts` + `components/ComparisonsProvider.tsx` — `comparisons[]` + `activeId`, capped at `MAX_COMPARISONS` (8), persisted to `localStorage` (`lib/comparisons/persist.ts`, key `pare:comparisons`). No duplicates — opening an open matchup switches to its tab.
  - `components/schedule/ScheduleProvider.tsx` — mounted in `app/layout.tsx` (survives Home↔Compare): loaded weeks, active week, shared NFL stats, accordion, scroll. Seeded server-side.
- **Compare layout (one compact component family):** `components/compare/*` + `components/mobile/Compact*` / `MobileCompareLayout` (`variant`: `full` | `inline` | `quadrant`). Phone `<768px` → swipeable single pane + tab bar; tablet/desktop → `CompareQuadrants` 2×2 (pages of 4). The old desktop stack (`OffensePanel`/`DefensePanel`/`DynamicComparisonRow`/`TeamDropdown`) is **retired**.
- **Hooks:** `useNflStats`, `useRanking`, `useDisplayMode`, `useBarCalculation`, `useLiveScores`, `useGameSummary`, `useIsMobile`. (`useTheme` retired.)
- **Client-side ranking only** — `useRanking` (tie tolerance `0.001`, `T-12th`); ordinals via `utils/ordinal.ts` (single source).
- **Single sources:** team abbr aliasing `lib/teams.ts` (`WSH→WAS`, `JAC→JAX`, `LA→LAR`), stat types `lib/types.ts`, API in-memory backup helper `lib/apiCache.ts`, `cn()` in `lib/utils.ts`.
- **Card grids:** always `components/ui/CardGrid.tsx` (`auto-fit`, `minCard` floor, `maxCols` cap — Standings 4, Leaders 5). No per-page breakpoints.
- **Rank badges:** top 5 gold, bottom 5 red, 6–27 slate (`--badge-*` sub-palette is intentional).
- **Errors:** Next `app/error.tsx` + `app/global-error.tsx` (`ErrorBoundary` retired). `global-error.tsx` keeps literal hex — CSS vars don't load there.

### theScore bar math

```ts
const teamAPercentage = (teamAValue / (teamAValue + teamBValue)) * 100;
const teamBPercentage = (teamBValue / (teamAValue + teamBValue)) * 100;
```

Bars grow inward and meet at the exact ratio; elite-vs-poor matchups get up to 3.0x amplification in `useBarCalculation`.

## UI stack

- **Tailwind v4.3** CSS-first: `app/globals.css` starts `@import 'tailwindcss'` + `@config '../tailwind.config.js'` (compat mode); custom classes are `@utility` blocks; PostCSS = `@tailwindcss/postcss`.
- Tokens mapped in `tailwind.config.js`: `bg-bg/surface/card`, `border-border`, `text-text/subtext/muted`, `bg-gold/gold-bright/green/fire/red/blue`, `shadow-card/pop`. Tints via `color-mix(in srgb, var(--gold) N%, transparent)`.
- **CVA + clsx + tailwind-merge** (`cn()`); components hand-built on Radix / `@floating-ui/react`. **No shadcn CLI.**
- Motion: **framer-motion** (only animation lib) + `@number-flow/react` for rolling stat values. Respect `prefers-reduced-motion`.
- Pending (see latest dev notes): radius remap (`rounded-lg`=14 / `rounded-xl`=20), quadrant card-in-card fix, dropdown keyboard nav + focus trap, full `@theme` port.

## Hard guardrails (never violate)

- Production-tested — **no architecture refactors without explicit approval** (record real decisions as ADRs in `docs/adr/`).
- Hook-based logic only; client-side ranking only; one source of truth per concern (above).
- Data layer is abstracted (`lib/espnStats`, `lib/fantasy`, …) — provider swaps stay inside it.
- iOS: **WKWebView wrapper now, native later.** Never edit `Pare.xcodeproj` — regenerate from `ios/project.yml`. HTTPS only (ATS). Open: prod URL still placeholder `pare-nfl.app` → should be `pare.gg`.
- Dead code goes to `_to-delete/<date>-<what>/` (excluded in `tsconfig.json`; Kobe deletes manually) — never silently removed.

## Verification (token-thrifty)

- `npm run check` (tsc + eslint) · `npm run test:run` (Vitest, pure logic) · `npm run build` · curl + jq (offense/defense APIs must return **32** rows) · `/api/health` shows the deployed `commit` + `builtAt`.
- CI (`.github/workflows/ci.yml`): `npm ci` → `npm run check` → design-token guard → `npm run test:run`.

## Docs ritual

- Conventional Commits (`feat:` / `fix:` / `refactor:` / `perf:` / `chore:` / `docs:`).
- Non-trivial change → dev note `docs/devnotes/YYYY-MM-DD-<task>.md` (rationale; link, don't duplicate) + `CHANGELOG.md` `[Unreleased]` bullet.
- Stale or wrong docs get corrected immediately.
- Session start: read the vault brain doc + this file, skim `CHANGELOG.md` `[Unreleased]` and today's dev notes, propose a short plan before coding.

## Commands

```bash
npm run dev            # dev (Turbopack, port 4000)
npm run dev:clean      # dev, nuking .next/.turbo/node_modules/.cache first (fixes Windows ENOENT)
npm run build          # production build
npm run check          # tsc --noEmit && eslint   (gate before committing)
npm run test:run       # vitest
npm run clean          # wipe .next etc. (run before a prod build)
```

**Deploy (manual — Cloudflare only tunnels):** commit + push from the Windows box (soypc), then on the M1 Mac mini:

```bash
git restore package-lock.json   # npm install rewrites platform entries; otherwise pull aborts
git pull
npm install                     # not `npm ci` — cross-platform lockfile
npm run clean
npm run build
pm2 restart pare                # app = "pare" (localhost:4000); tunnel = "pare-tunnel"
pm2 logs pare                   # watch for ESPN 429/403
```

**iOS (Mac mini only):** `cd ios && ./Scripts/setup.sh` (first time) · `open ios/Pare.xcodeproj` (build/run).

## Environment gotchas

- **PowerShell 5.x rejects `&&`** — one command per line.
- **`git grep` exclude pathspec unsupported** — scope instead: `git grep -n "x" -- app components lib utils`.
- **Windows `.next` ENOENT (`_buildManifest.js.tmp.*`)** — OneDrive syncing `Documents\`. `npm run dev:clean`; durable fix = move the repo out of OneDrive.
- **Pushing `.github/workflows/*`** needs a GitHub PAT with the `workflow` scope.
- **Cloudflare isn't caching the app** (`cf-cache-status: DYNAMIC`); restarting `pare-tunnel` never affects data freshness.
- **Claude via `repos` MCP is filesystem-only** (read/write/edit, no shell) — Kobe/Cursor run npm/git/build. Cloud sandboxes can't reach ESPN or pare.gg reliably — verify data on Kobe's machines.

## Key facts

| Fact | Value |
|---|---|
| Prod URL | https://pare.gg (Cloudflare Tunnel → Mac mini :4000) |
| Repo | github.com/eastsidelbc/Pare (`main`) |
| Dev port | 4000 |
| Data sources | ESPN (schedule/stats/standings/leaders) + Sleeper (fantasy) |
| Bundle ID | `com.OptimusCashLLC.pare` |
| Max comparisons | 8 (`APP_CONSTANTS.MAX_COMPARISONS`) |
| Special rows filtered | `Avg Team`, `League Total`, `Avg Tm/G`, `Avg/TmG` |
| Tie notation / tolerance | `T-12th` / `0.001` |
| Data freshness | live 15s · standings instant · schedule 5 min · stats 10 min · leaders 6h |
| Service worker default | OFF (`NEXT_PUBLIC_ENABLE_SW=true` to enable; off on pare.gg) |

## End Session → Vault Brain

When Kobe says "end session":
1. Ask ONE question: "What do you want to work on next session?" Wait for the answer.
2. Write ONE summary to the Obsidian vault (outside this repo — confirm the write if prompted):
   `/mnt/d/Programs/Obsidian/Vault/Me/Projects/Pare/session-summaries/YYYY-MM-DD-session.md`
   (`/mnt/d/...` in WSL = `D:\...` in Windows. On the Mac mini the vault isn't present — update repo `CHANGELOG.md` there and file the vault summary from the Windows box.)
3. Format:
```
[SESSION COMPLETE] — [YYYY-MM-DD]
BUILT:      [what was done]
BUGS FIXED: [list or none]
DECISIONS:  [list or none]
COMMITS:    [suggested git messages]
NEXT SESSION:
Goal:       [what Kobe said he wants next]
First step: [exact first action]
Read first: [files to load at session start]
```
Repo `CHANGELOG.md` = technical state. Vault summary = cross-project brain. Do both.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CLAUDE.md — Pare (lean, consolidated) — PROPOSED

> DRAFT from the cleanup overhaul (2026-10-01). Merges the old `CLAUDE.md`,
> `.cursorrules`, and the key architecture facts into one lean source of truth,
> updated for the post-overhaul reality (ESPN/Sleeper data, no CSV layer).
> Review, then — if you like it — replace the repo `CLAUDE.md` with this and point
> `.cursorrules` at it. `styleguide.md` (design system) and `DATA_SOURCES.md` stay
> as their own references.

---

## What Pare is

NFL team head-to-head stat comparison platform.

- **Web:** Next.js 15 + React 19 + TypeScript + Tailwind v3 — production, port 4000
- **iOS:** SwiftUI + WKWebView wrapper — Phase C scaffold (see `docs/mobile/IOS_RUNBOOK.md`)
- **Signature visual:** theScore-style proportional inward bars
- **Audience:** NFL fans, fantasy players, casual stat-checkers

## Standing rules (always apply)

- **Dark mode only. Mobile-first** — design at ~390px (iPhone 14 Pro); tablet/desktop are enhanced bonuses. The web app is the base for the iOS app.
- **TypeScript strict, no `any`.** Typed props/interfaces. Hooks hold logic; components render only.
- **Tailwind utilities + design tokens** (see `styleguide.md`). No ad-hoc inline styles.
- **Surgical over rebuild** — small, atomic changes scoped to exactly what's asked. Don't refactor unrelated code.
- **Don't touch the data layer, ranking / display-mode / bar-calculation math, or hook signatures** unless the task explicitly says so. The theScore inward-bar logic is the heart of the app.
- **One source of truth, no duplicate global state** — team selection lives at `app/compare/page.tsx`, passed via props. Team-abbr aliasing lives in `lib/teams.ts`. Shared stat types live in `lib/types.ts`.

## Data (ESPN + Sleeper — no CSV)

All data is live from public APIs; there is **no** CSV/PFR layer (removed in the 2026-10 overhaul). See `DATA_SOURCES.md` for endpoints and gotchas.

- **Schedule + live scores:** ESPN scoreboard (`lib/espnScoreboard.ts`, `lib/schedule.ts`).
- **Offense stats:** ESPN team statistics (`lib/espnStats.ts`). Team yards use NET (`netPassingYards`/`netTotalYards`) so offense matches defense-allowed.
- **Defense:** points allowed via ESPN standings; yards/3rd-down opponent-aggregated from box scores (`lib/espnStats.ts`).
- **Fantasy (QB/RB/WR/TE/K/D-ST):** Sleeper (`lib/fantasy.ts`). The ~20MB player map is fetched at most once per 24h per process and cached (trimmed) in memory — never per request.
- **Freshness (self-hosted, verified 2026-10-02):** live scores ~15s (browser polls ESPN while a game is live or within 10 min before / 3h after kickoff — `lib/liveWindow.ts`); standings instant (`no-store`); schedule 5 min; Compare offense/defense stats + W-L record 10 min (route ISR + `REVALIDATE_SECONDS`); finished box scores cached 24h per game; leaderboards 6h. Offense/defense routes keep an in-memory copy as a **last-good backup only** (served on ESPN failure, never in front of ISR). Never nest `unstable_cache`/cached fetch inside `unstable_cache` — Next bypasses nested caches. Full table + rules: repo `CLAUDE.md` → "Data Freshness".

## Architecture

- **Hook-based:** business logic in `useNflStats`, `useRanking`, `useDisplayMode`, `useTheme`, `useBarCalculation`. Components render only.
- **Client-side ranking only** — all rank math via `useRanking` (float tie tolerance `0.001`, tie notation `T-12th`). Never server-side.
- **Self-contained panels:** `OffensePanel` / `DefensePanel` own their display mode + metrics.
- **Responsive split:** desktop panels + `components/mobile/Compact*` variants, routed by viewport. Both are live — not duplicates.
- **Card grids:** every grid of cards uses the shared `components/ui/CardGrid.tsx` (`auto-fit` with `minCard` floor + `1fr` growth, `maxCard`/`maxCols` caps). `minCard` controls how many fit; cards grow to fill. No per-page breakpoints, no JS device detection.

### theScore bar math

```ts
const teamAPercentage = (teamAValue / (teamAValue + teamBValue)) * 100;
const teamBPercentage = (teamBValue / (teamAValue + teamBValue)) * 100;
```

Bars grow inward and meet at the exact ratio; elite-vs-poor matchups get up to 3.0x amplification in `useBarCalculation`.

### Metrics

Central registry `lib/metricsConfig.ts` (44+ metrics). `higherIsBetter` is set from the **offense** perspective; the UI inverts interpretation for defense (e.g. `turnovers` = committed on offense, forced on defense). To add one: define it in `metricsConfig.ts`, set availability + `higherIsBetter`, optionally add to the DEFAULT_* sets.

## Hard guardrails (never violate)

- Web app is production-tested — **no architecture refactors without explicit approval**.
- **Hook-based logic only** (no business logic in JSX); **client-side ranking only**.
- **Global team state at the compare page only** — props down, no external state library.
- **Single source of truth** for team aliasing (`lib/teams.ts`) and stat types (`lib/types.ts`) — don't re-introduce per-file copies.
- iOS: **WKWebView wrapper now, native port later** (decided). Never edit `Pare.xcodeproj` directly — regenerate from `ios/project.yml`. Production URL must be HTTPS (ATS).
- Code: all major components in `ErrorBoundary`; memoize expensive calcs; use `utils/logger.ts`; careful `useEffect` deps.

## Verification (token-thrifty)

- **Cheap checks only:** `npm run check` (tsc + eslint), `npm run typecheck`, curl + jq, row counts (offense/defense APIs must return **32**), internal-consistency assertions.
- **Cursor agents: do not drive a browser or screenshot to self-verify** — Kobe checks the UI himself. (Live in-session browser verification by Claude, when Kobe asks for it, is fine.)

## Docs ritual

- Conventional Commits (`feat:` / `fix:` / `refactor:` / `perf:` / `chore:` / `docs:`).
- Non-trivial change → short dev note at `docs/devnotes/YYYY-MM-DD-<task>.md` (rationale only, link don't duplicate) + a `CHANGELOG.md` `[Unreleased]` bullet.
- Genuine architectural decision → an ADR in `docs/adr/`.
- `CHANGELOG.md` is the authoritative state of what's done.

## Commands

```bash
npm run dev            # dev (Turbopack, port 4000)
npm run dev:clean      # dev, nuking .next/.turbo/node_modules/.cache first
npm run build          # production build
npm run check          # tsc --noEmit && eslint   (gate before committing)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint

# deploy (M1 Mac mini, PM2)
pm2 start npm --name "pare-nfl" -- start && pm2 restart pare-nfl

# iOS (Mac mini only)
cd ios && ./Scripts/setup.sh    # first-time: XcodeGen + generate project
open ios/Pare.xcodeproj         # build/run (Cmd+R)
```

## Key facts

| Fact | Value |
|---|---|
| Dev port | 4000 |
| Data sources | ESPN (schedule/offense/defense) + Sleeper (fantasy) |
| Bundle ID | `com.OptimusCashLLC.pare` |
| Default matchup | Minnesota Vikings vs Detroit Lions |
| Special rows filtered | `Avg Team`, `League Total`, `Avg Tm/G`, `Avg/TmG` |
| Tie notation / tolerance | `T-12th` / `0.001` |
| Data freshness | stats 10 min · standings instant · live 15s · schedule 5 min · leaders 6h · Sleeper player map 24h |
| Service worker default | OFF (`NEXT_PUBLIC_ENABLE_SW=true` to enable) |
| Abbr aliases | `WSH->WAS`, `JAC->JAX`, `LA->LAR` (in `lib/teams.ts`) |

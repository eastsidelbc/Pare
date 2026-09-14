# CLAUDE.md — Pare (repo technical reference)

> **Master brain doc lives in vault:**
> `D:\Programs\Obsidian\Vault\Me\Projects\Pare\CLAUDE.md`
>
> Read that FIRST every session. It owns: identity, hard rules, current focus, protected files, paths.
> This file owns: deep technical reference for AI agents working inside the repo.
>
> **Current state authority:** `CHANGELOG.md` (not this file).

---

## 🎯 What Pare Is

NFL team head-to-head stat comparison platform.

- **Web:** Next.js 15 + React 19 + TypeScript + Tailwind v3 — production
- **iOS:** SwiftUI + WKWebView wrapper — Phase C scaffold complete (2025-10-14)
- **Data:** Manual CSV from Pro Football Reference, 6hr in-memory cache
- **Audience:** NFL fans, fantasy players, casual stat-checkers
- **Signature visual:** theScore-style proportional inward bars

## 🛠️ Commands

```bash
# Web dev (port 4000)
npm run dev              # Start dev with Turbopack
npm run dev:clean        # Same, but nukes .next + .turbo + node_modules/.cache first
npm run build            # Production build
npm run start            # Production server (port 4000)
npm run lint             # ESLint

# Production deploy (M1 Mac mini, PM2)
pm2 start npm --name "pare-nfl" -- start
pm2 status
pm2 logs pare-nfl
pm2 restart pare-nfl

# iOS (Mac mini only)
cd ios && ./Scripts/setup.sh        # First-time: install XcodeGen, generate project
cd ios && ./Scripts/gen_xcode.sh    # Regen after editing project.yml
open ios/Pare.xcodeproj             # Build & run from Xcode (⌘R)

# Data updates (weekly)
# 1. Export https://www.pro-football-reference.com/years/2025/#team_stats → data/pfr/offense-2025.csv
# 2. Export https://www.pro-football-reference.com/years/2025/opp.htm#team_stats → data/pfr/defense-2025.csv
# 3. Cache auto-invalidates after 6hr (or pm2 restart pare-nfl)
```

## 📂 Architecture Overview

### Core philosophy
- **Hook-based:** business logic in custom hooks (`useNflStats`, `useRanking`, `useDisplayMode`, `useTheme`, `useBarCalculation`). Components render only.
- **Client-side ranking:** all rank math via `useRanking` hook. Never server-side. Sacred rule.
- **Self-contained panels:** `OffensePanel` and `DefensePanel` manage their own display mode + metrics independently.
- **Position-based CSV mapping:** handles duplicate "Yds" columns by column position, not name. In `lib/pfrCsv.ts`. Sacred.
- **Global team selection:** lives at `app/compare/page.tsx` only. Single source of truth. Props flow down. No external state library.

### File structure

```
app/
  page.tsx                  Landing page (API docs)
  compare/page.tsx          Main comparison interface (desktop + mobile router)
  layout.tsx                Global layout, metadata, SW registration
  api/
    health/route.ts         Health check (returns { ok, version })
    nfl-2025/
      offense/route.ts      Offense API — CSV → JSON
      defense/route.ts      Defense API — CSV → JSON
    preferences/route.ts    User preference persistence

components/
  OffensePanel.tsx          Self-contained offense section
  DefensePanel.tsx          Self-contained defense section
  DynamicComparisonRow.tsx  Individual metric row (bars + ranks)
  RankingDropdown.tsx       Click-rank-to-swap-team dropdown (resolved 2025-09-25)
  TeamSelector.tsx          Team dropdown
  TeamSelectionPanel.tsx    Top-of-page team selector
  MetricsSelector.tsx       Metrics selection UI
  FloatingMetricsButton.tsx Floating action button
  TeamLogo.tsx              Team logo component
  ThemeCustomizer.tsx       Theme picker
  OfflineStatusBanner.tsx   PWA offline indicator
  PWAInstallPrompt.tsx      "Add to home screen" prompt (currently disabled)
  ErrorBoundary.tsx         Panel-level error boundaries
  mobile/                   8 mobile-optimized components
    MobileCompareLayout.tsx Mobile UI root
    Compact*.tsx            Compact variants of desktop components
    MobileTopBar.tsx
    MobileBottomBar.tsx

lib/
  useNflStats.ts            Data fetching + caching hook
  useRanking.ts             ⚠️ PROTECTED — client-side rank math + tie handling
  useDisplayMode.ts         Per-game vs total toggle
  useTheme.ts               Dynamic theming
  useBarCalculation.ts      theScore bar width math
  useTeamSelection.ts       Team selection helpers
  usePreferences.ts         User preference persistence
  useOfflineStatus.ts       PWA offline detection
  usePWA.ts                 PWA install state
  metricsConfig.ts          44+ metric registry (see Metrics System section)
  pfrCsv.ts                 ⚠️ PROTECTED — position-based CSV parser
  pfr.ts                    PFR types + helpers
  hooks/
    useIsMobile.ts          Viewport detection

config/
  constants.ts              API endpoints, cache TTL, special team filter list

utils/
  teamDataTransform.ts      API response → UI data shape
  logger.ts                 Structured logging w/ emoji prefixes + request IDs
  helpers.ts                Common helpers

data/pfr/
  offense-2025.csv          Manual export
  defense-2025.csv          Manual export
  CSV_INSTRUCTIONS.md       How to export from PFR

ios/                        iOS WKWebView wrapper (Phase C complete)
  project.yml               ⚠️ PROTECTED — XcodeGen spec
  Config/
    Debug.xcconfig          → localhost:4000
    Release.xcconfig        → production URL (TBD)
  Scripts/
    setup.sh                First-time setup
    gen_xcode.sh            Regen .xcodeproj
  Pare/
    App/
      PareApp.swift         App entry (@main)
      AppCoordinator.swift  Global state (ObservableObject)
    Web/
      WebViewContainer.swift  ⚠️ PROTECTED — WKWebView + KVO observers
      WebViewModel.swift      WebView state
      PareBridge.swift        JS ↔ Swift messaging
    UI/
      Tabs/
        PareTabView.swift   Bottom tab bar (Home, Settings, Debug)
        HomeTab.swift       Hosts WebViewContainer
        SettingsTab.swift   Native SwiftUI settings
        DebugTab.swift      Native dev tools
      Common/               Shared SwiftUI components
    Models/                 Swift data structures
    Resources/
      Assets.xcassets/      App icon, accent color (purple)
      Info.plist            ATS config

docs/
  mobile/
    IOS_RUNBOOK.md          ⭐ iOS dev workflow guide
    IOS_WRAPPER_PLAN.md     Phase B architecture decision
    AUDIT_iOS_FOUNDATION.md Phase A feasibility audit
  adr/                      Architecture Decision Records
  devnotes/                 Per-session dev notes (YYYY-MM-DD-task.md)
  audits/                   Code audit reports
  archive/                  Old docs

CHANGELOG.md                ⭐ Authoritative state of what's done
.cursorrules                Cursor IDE session ritual
```

### Data flow

```
Pro Football Reference (manual CSV export, weekly)
   ↓
data/pfr/offense-2025.csv  +  data/pfr/defense-2025.csv
   ↓
lib/pfrCsv.ts  (position-based column mapping, handles duplicate "Yds")
   ↓
app/api/nfl-2025/{offense,defense}/route.ts  (6hr in-memory cache)
   ↓  JSON
lib/useNflStats.ts  (client hook, fetches both, transforms shape)
   ↓
app/compare/page.tsx  (global team + metric state)
   ↓  props
OffensePanel + DefensePanel  (self-contained, own display mode)
   ↓
DynamicComparisonRow  (per-metric row)
   ├→ useRanking  (client-side rank math, float tolerance, tie handling)
   └→ useBarCalculation  (theScore bar width with rank amplification)
```

## 🎨 theScore Bar Math

Bars grow inward from each side and meet in the middle at the exact performance ratio:

```typescript
const teamAPercentage = (teamAValue / (teamAValue + teamBValue)) * 100;
const teamBPercentage = (teamBValue / (teamAValue + teamBValue)) * 100;
```

- **Inward growth:** left bar extends right, right bar extends left
- **Perfect connection:** bars always meet in the middle
- **Rank amplification:** elite-vs-poor matchups get up to 3.0x visual scaling for drama (in `useBarCalculation`)

## 📊 Metrics System

Central registry: `lib/metricsConfig.ts`. 44+ metrics. Same CSV data, context-dependent interpretation.

### Metric definition

```typescript
interface MetricDefinition {
  name: string;           // "Passing Yards (Yds)"
  field: string;          // "pass_yds" — CSV field key
  category: 'scoring' | 'passing' | 'rushing' | 'efficiency' | 'defense' | 'special' | 'advanced';
  higherIsBetter: boolean;  // Set from offense perspective; UI inverts for defense
  format: 'number' | 'decimal' | 'percentage' | 'time';
  description: string;
  availableInOffense: boolean;
  availableInDefense: boolean;
}
```

### Context-dependent metrics

Same number, different meaning depending on panel:

| Metric | Offense reading | Defense reading |
|---|---|---|
| `turnovers` | Committed (bad) | Forced (good) |
| `pass_int` | Thrown (bad) | Made (good) |
| `fumbles_lost` | Lost (bad) | Forced (good) |
| `points` | Scored (good) | Allowed (bad) |
| `pass_yds` | Gained (good) | Allowed (bad) |
| `turnover_pct` | Drives lost to TO (bad) | Drives forced to TO (good) |

`higherIsBetter` is set from the **offense** perspective. UI flips ranking interpretation for defense.

### Default selections

```typescript
DEFAULT_OFFENSE_METRICS = ['points', 'total_yards', 'pass_yds', 'rush_yds', 'score_pct'];

DEFAULT_DEFENSE_METRICS = [
  'points',       // allowed
  'total_yards',  // allowed
  'pass_yds',     // allowed
  'rush_yds',     // allowed
  'turnovers',    // forced (good!)
  'pass_int',     // made (good!)
  'score_pct',    // opponent
  'turnover_pct'  // opponent (good for defense!)
];
```

### Adding a new metric

1. Add CSV column position to `CSV_COLUMN_MAPPING_BY_POSITION` in `lib/pfrCsv.ts`
2. Add definition to `AVAILABLE_METRICS` in `lib/metricsConfig.ts`
3. Set `availableInOffense` / `availableInDefense` flags
4. Set `higherIsBetter` from offense perspective
5. Optionally add to `DEFAULT_OFFENSE_METRICS` / `DEFAULT_DEFENSE_METRICS`
6. Done — metric auto-appears in selectors + ranking

## 🔧 CSV Processing

`lib/pfrCsv.ts` uses **position-based** column mapping because PFR has multiple "Yds" columns:

```typescript
const CSV_COLUMN_MAPPING_BY_POSITION = {
  3:  'points',       // PF
  4:  'total_yards',  // Yds (position 4 = TOTAL)
  12: 'pass_yds',     // Yds (position 12 = PASSING)
  18: 'rush_yds',     // Yds (position 18 = RUSHING)
  // ...
};
```

**Never** change positions without updating both `offense/route.ts` and `defense/route.ts`. Wrong position = all stats wrong.

## ⚡ Smart Per-Game Calculations

Auto-excludes percentages and rates from per-game conversion:

```typescript
if (!key.includes('pct') && !key.includes('per') && isNumeric(teamData[key])) {
  teamData[key] = (parseFloat(teamData[key]) / games).toFixed(1);
}
```

`useDisplayMode` hook owns this. Toggle is per-panel.

## 🍎 iOS Wrapper (current focus)

**Status:** Phase C scaffold complete (2025-10-14). Not yet built. See `CHANGELOG.md` for full history.

### Architecture
- SwiftUI shell + WKWebView for content
- 3 tabs: **Home** (WebView), **Settings** (native), **Debug** (native)
- Bundle ID: `com.OptimusCashLLC.pare`
- iOS 16+, iPhone + iPad
- XcodeGen-managed (`project.yml` → `Pare.xcodeproj`)

### Wired features
- Pull-to-refresh
- Progress bar (KVO on `estimatedProgress`)
- External links → `SFSafariViewController`
- JS bridge (`PareBridge`) for iOS ↔ Web messaging
- Custom user agent: `Pare-iOS/{version} (iPhone; iOS {sysVer})`
- Environment switch in Settings tab

### Next concrete actions
1. Run `ios/Scripts/setup.sh` on Mac mini → generates `Pare.xcodeproj`
2. Open in Xcode → first iPhone simulator build
3. Decide production URL for `Release.xcconfig` (currently placeholder)
4. Physical device test
5. TestFlight prep — Apple Developer account, code signing, App Store Connect metadata

### iOS development docs
- ⭐ `docs/mobile/IOS_RUNBOOK.md` — workflow guide (start here)
- `docs/mobile/IOS_WRAPPER_PLAN.md` — Phase B architecture decision
- `docs/mobile/AUDIT_iOS_FOUNDATION.md` — Phase A feasibility

## 🚨 Hard Guardrails (Never Violate)

### Architecture
- Web app is **production-tested** — never refactor architecture without explicit approval
- **Hook-based logic only** — components render UI, no business logic in JSX
- **Client-side ranking only** — never server-side (violates performance design)
- **Self-contained panels** — `OffensePanel` and `DefensePanel` own their state. Don't fragment.
- **Global team state at `ComparePage` only** — props flow down, no external state library
- **Position-based CSV mapping is sacred** — change one place, you break everything

### iOS
- **WKWebView wrapper now, native Swift port later** — decided path, don't switch mid-stream
- **Never edit `Pare.xcodeproj` directly** — always regenerate from `ios/project.yml`
- **Production URL must be HTTPS** — App Store ATS requires it

### Code standards
- TypeScript everywhere, no `any` types
- All major components wrapped in `ErrorBoundary`
- Memoize expensive calculations (`useMemo`, `useCallback`)
- Use `utils/logger.ts` with emoji prefix + request ID
- Define explicit TS interfaces for props
- Careful with `useEffect` dependencies (no infinite re-renders)

### Before any change
- [ ] Vault `Projects\Pare\CLAUDE.md` read
- [ ] `CHANGELOG.md` `[Unreleased]` checked
- [ ] Why does the existing code work this way? (Understand before changing.)
- [ ] Will this affect protected files? Hook contracts? Global state?
- [ ] Does this maintain ~50ms API response time?
- [ ] Does it preserve single source of truth for team selection?

## 🧪 Testing & Health Checks

```bash
# API smoke tests (port 4000)
curl http://localhost:4000/api/health | jq
curl http://localhost:4000/api/nfl-2025/offense | jq '.rows | length'   # → 32
curl http://localhost:4000/api/nfl-2025/defense | jq '.rows | length'   # → 32

# Specific team
curl http://localhost:4000/api/nfl-2025/offense | jq '.rows[] | select(.team == "Baltimore Ravens")'

# Per-game verification
curl http://localhost:4000/api/nfl-2025/offense | jq '.rows[0] | {team, points, games: .g}'
```

### Common debugging

**No API data?**
- Check `data/pfr/*.csv` files exist
- Verify column positions match
- Read server logs

**Rankings wrong?**
- Verify `higherIsBetter` in `metricsConfig.ts`
- Check defense panel inverts interpretation
- Test `calculateBulkRanking` directly

**Bars look off?**
- Check for null/undefined values
- Verify `useBarCalculation` dependencies
- Confirm `teamAPercentage + teamBPercentage ≈ 100%`
- Look for rank amplification edge cases

**State not updating?**
- Trace callback chain with `logger.debug`
- Watch for stale closures in handlers
- Verify `useEffect` deps
- Check props threading through tree

**CSS changes not applying?**
- Service worker caching → `npm run dev:clean`
- Or manually: DevTools → Application → Service Workers → Unregister → Clear site data
- SW is **disabled by default** (`NEXT_PUBLIC_ENABLE_SW=true` to enable)

## 📝 Cursor Session Ritual

Repo has `.cursorrules`. Cursor agent must:
1. Read this file + vault `CLAUDE.md`
2. Skim `CHANGELOG.md` `[Unreleased]`
3. Skim today's `docs/devnotes/YYYY-MM-DD-*.md` (create if missing)
4. Output: Rule Summary, Ambiguities/Conflicts, confirmation:
   `"I will not duplicate CLAUDE.md content in Dev Notes; I will link to it."`
5. Propose 3–5 step plan before coding

## 📌 Key Facts (Quick Reference)

| Fact | Value |
|---|---|
| Dev port | **4000** |
| Bundle ID | `com.OptimusCashLLC.pare` |
| Default matchup | Minnesota Vikings vs Detroit Lions |
| Special team rows filtered | `Avg Team`, `League Total`, `Avg Tm/G`, `Avg/TmG` |
| Tie notation | `T-12th` |
| Float tolerance for ties | `0.001` |
| Cache TTL | 6 hours |
| Service worker default | OFF (`NEXT_PUBLIC_ENABLE_SW=true` to enable) |
| Emoji log prefixes | 🏈 offense, 🛡️ defense, 🏆 ranking, 🚀 state, ✅ success, ❌ error, ⚠️ warning |

---

**State authority:** `CHANGELOG.md`
**Brain doc:** `D:\Programs\Obsidian\Vault\Me\Projects\Pare\CLAUDE.md`
**Session history:** `D:\Programs\Obsidian\Vault\Me\Projects\Pare\session-summaries\`

---

## End Session → Vault Brain
When I say "end session":
1. Ask ONE question: "What do you want to work on next session?" Wait for answer.
2. Write ONE summary to the Obsidian vault (outside this repo — confirm the write if prompted):
   `/mnt/d/Programs/Obsidian/Vault/Me/Projects/Pare/session-summaries/YYYY-MM-DD-session.md`
   (`/mnt/d/...` in WSL = `D:\...` in Windows. If running Claude Code on the Mac mini instead, the vault isn't on that machine — write repo `CHANGELOG.md` there and file the vault summary from the Windows box.)
3. Use this format:
```
[SESSION COMPLETE] — [YYYY-MM-DD]
BUILT:      [what was done]
BUGS FIXED: [list or none]
DECISIONS:  [list or none]
COMMITS:    [suggested git messages]
NEXT SESSION:
Goal:       [what I said I want next]
First step: [exact first action]
Read first: [files to load at session start]
```
Repo `CHANGELOG.md` = technical state. Vault summary = cross-project brain. Do both.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

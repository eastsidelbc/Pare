# ARCHITECTURE.md — System Design & File Responsibilities

---

## 🧩 Overview
Pare = modular Next.js 15 app for comparing NFL teams using real-time data.  
All data flows client-side; no server-side ranking.

---

## 📂 File Hierarchy & Responsibilities

### `app/`
- **`page.tsx`** → Landing / Docs overview.  
- **`compare/page.tsx`** → Main Compare UI & global state.  
- **`layout.tsx`** → Root layout / theme provider.

### `app/api/nfl-2025/`
- `offense/route.ts` → CSV→JSON API (6 hr cache).  
- `defense/route.ts` → Same pattern.

### `app/api/` (other endpoints)
- `health/route.ts` — app health/status (version, uptime)
- `preferences/route.ts` — stubbed user prefs (GET/PUT, no-store)
- `mock/scoreboard/route.ts` — mocked scoreboard feed
- `mock/matchup/route.ts` — mocked single matchup (query: away=X&home=Y)

### `components/`
- `OffensePanel.tsx` / `DefensePanel.tsx` → Self-contained metric sections.  
- `DynamicComparisonRow.tsx` → Renders values & bars.  
- `RankingDropdown.tsx` → Interactive ranking selector.  
- `TeamSelectionPanel.tsx` → Top-level team picker.  
- `MetricsSelector.tsx` → Metric filter UI.  
- `ScoreboardRail.tsx` → Lightweight mocked scoreboard (TeamLogo, odds, time helpers).  
- `mobile/` (compact mobile UI)
  - `MobileCompareLayout.tsx` — Mobile shell wrapping compact offense/defense.  
  - `CompactPanel.tsx` — Uses `useDisplayMode`, `CompactComparisonRow`, compact dropdowns.

### `lib/`
- `useNflStats.ts` → Fetch & cache API data.  
- `useRanking.ts` → Compute client-side ranks.  
- `useDisplayMode.ts` → Per-game vs total toggle.  
- `useTheme.ts` → Dynamic colors / themes.  
- `useBarCalculation.ts` → Ratio math for bars.  
- `metricsConfig.ts` → Metric registry (44 + metrics).  
- `pfrCsv.ts` → Position-based CSV mapping.  
- `hooks/`
  - `useIsMobile.ts` → `(breakpoint=1024) => boolean` (layout branching).  
  - `useScoreboardMock.ts` → `(pollMs=5000) => { games, isLoading, error, showSkeleton }` (mock rail).

### `utils/`
- `teamDataTransform.ts` → Transform helpers.  
- `logger.ts` → Structured logging.  
- `helpers.ts` → Common utilities.

---

## 🔄 Data Flow Diagram
```
CSV (PFR)
  ↓
API Route (CSV→JSON)
  ↓
useNflStats()
  ↓
useRanking() / useDisplayMode() / useTheme()
  ↓
DynamicComparisonRow
  ↓
Inward Bars (theScore-style)
```

### Key Data Flow Actors
- `SelectionContext` — Holds current teams, swap state, and optionally selected mock game.  
  Read by Compare page → panels; written by Team selectors & Ranking dropdowns.

---

## 📊 Metrics Registry Overview
- **44 + metrics** with context-dependent ranking.  
- Offense → higher = better.  
- Defense → inverted interpretation.  
- Metric definition fields: name | field | category | higherIsBetter | format | availability.

---

## ⚡ Performance Targets
- Cached API < 50 ms; fresh < 200 ms.  
- React render < 16 ms/frame.  
- Memory stable ≤ 150 MB browser.

### Performance Techniques
- `MetricsSelector` is dynamically imported and preloaded by `FloatingMetricsButton` to reduce initial JS bundle size and keep user interaction snappy.

---

## 🧠 Hook Contracts
| Hook | Returns | Notes |
|------|----------|-------|
| useNflStats | offenseData, defenseData, isLoading | Handles fetch + cache |
| useRanking | rank, sortedTeams | Client-side ranking |
| useDisplayMode | mode, setMode, transformTeamData | Per-game logic |
| useTheme | teamAColor, teamBColor | UI colors |
| useBarCalculation | getWidths() | Ratio math |

---

## 🧩 Future Expansion
- Background scheduler for data refresh.  
- WebSocket bridge for live games.  
- Shared core library → React Native port.  
- Audits stored in `/docs/audit/AUDIT_ARCHITECTURE_YYYY-MM-DD.md` for historical architecture snapshots.

---

*End of ARCHITECTURE.md*
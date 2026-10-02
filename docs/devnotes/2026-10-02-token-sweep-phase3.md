# Dev Note — Phase 3 Design Token Sweep (Colors Only)
**Date:** 2026-10-02  
**Branch:** tailwind-v4  
**Scope:** Surgical color tokenization — no redesigns, no refactors.

---

## What Was Done

Replaced every hardcoded color literal (hex, `rgba()`) and raw Tailwind palette class used for **color** across `components/` and `app/` with design tokens from `globals.css :root` and `tailwind.config.js`.

### New tokens added to `app/globals.css :root`

```css
/* Bar gradient dark stops */
--green-deep: #16a34a;
--fire-deep:  #ea580c;

/* Badge-specific vars (RankBadge tier colors) */
--badge-gold:       #e8b923;
--badge-gold-deep:  #c99a12;
--badge-gold-text:  #1a1400;
--badge-red:        #e5484d;
--badge-red-deep:   #c93b40;
--badge-slate:      #7c8698;
```

---

## Files Changed

| File | Changes |
|------|---------|
| `app/globals.css` | Added `--green-deep`, `--fire-deep`, badge CSS vars |
| `components/mobile/CompactComparisonRow.tsx` | Stat text, bar gradients, empty track |
| `components/BottomNav.tsx` | Active tab gold tint |
| `components/standings/DivisionTable.tsx` | Leader row gold tint |
| `components/leaderboards/LeaderCard.tsx` | Gold tint |
| `components/leaderboards/FantasyBoards.tsx` | Mode tab gold tint |
| `components/compare/BlankComparePicker.tsx` | Icon bg gold tint ×2 |
| `components/compare/CompareTabBar.tsx` | Active tab `#0a0e1a` → `var(--bg)`, gold rgba |
| `components/compare/CompareQuadrants.tsx` | Add-slot icon bg gold tint |
| `components/compare/QuadrantMetricsButton.tsx` | Tab active gold tint |
| `components/compare/ComparePane.tsx` | Atmospheric hex gradients, slate/red palette |
| `components/compare/CompareWorkspace.tsx` | Error-state hex gradients, slate/red/blue palette |
| `components/mobile/CompactRankingDropdown.tsx` | 4 colored rgba values |
| `components/mobile/CompactTeamSelector.tsx` | Gold and muted rgba values |
| `components/schedule/WeekControl.tsx` | Active week gold tint |
| `components/schedule/MatchupAccordion.tsx` | Button text `#0a0e1a` → `var(--bg)` |
| `components/ui/RankBadge.tsx` | All hex constants → `var(--badge-*)` / `color-mix()` |
| `components/DynamicComparisonRow.tsx` | Fallback classes (slate→surface/border), hex gradients |
| `components/DefensePanel.tsx` | Slate/purple palette classes |
| `components/OffensePanel.tsx` | Slate/purple palette classes |
| `components/ErrorBoundary.tsx` | Slate/red/blue palette classes |
| `components/FloatingMetricsButton.tsx` | Slate/purple palette classes |
| `components/RankingDropdown.tsx` | Slate/green-500/orange-500/amber palette classes |
| `components/MetricsSelector.tsx` | Slate/blue/green/red/purple palette classes |
| `components/TeamSelectionPanel.tsx` | Slate palette classes |
| `components/TeamLogo.tsx` | `text-slate-400` → `text-subtext` |
| `components/TeamSelector.tsx` | Slate/purple palette classes |
| `components/ThemeCustomizer.tsx` | Slate/purple palette classes |
| `components/PWAInstallPrompt.tsx` | Slate palette classes (purple install CTAs left) |

---

## 3 Intentional Visual Shifts

**Eyeball these three spots — everything else should look identical:**

### 1. BottomNav active tab + DivisionTable leader row + LeaderCard
- **Before:** `rgba(245,200,66,0.15)` / `rgba(212,168,67,0.08)` / `rgba(245,200,66,0.12)` — hardcoded gold tints
- **After:** `color-mix(in srgb, var(--gold) N%, transparent)` — same visual output, but now responds to `--gold` token

### 2. CompactComparisonRow stat text
- **Before:** `text-white` (hard white)
- **After:** `text-text` (`var(--text)` = `#f1f5f9`, off-white) — very subtle shift

### 3. CompactComparisonRow empty-data bar track
- **Before:** `bg-white/5` (white at 5% opacity)
- **After:** `bg-border` (`var(--border)` = `#2a3450`) — slightly more visible dark track

---

## Grep Guard Output

Remaining residue after the sweep (all intentionally excluded):

```
# Black/white-alpha overlays & shadows (excluded per spec)
components\compare\CompareQuadrants.tsx:302     rgba(0,0,0,0.45)      — close-tab box-shadow
components\compare\CompareTabBar.tsx:67         rgba(255,255,255,.05) — inactive tab bg
components\compare\CompareTabBar.tsx:107        rgba(255,255,255,.05) — can't-add slot bg
components\compare\QuadrantMetricsButton.tsx:63 rgba(0,0,0,0.6)       — overlay backdrop
components\mobile\CompactTeamSelector.tsx       rgba(0,0,0,0.6) ×2    — modal overlay
components\mobile\CompactRankingDropdown.tsx    rgba(0,0,0,0.6) ×2    — modal overlay

# Purple install CTAs — no purple token, intentional
components\PWAInstallPrompt.tsx                 bg-purple-500/600/700 — install buttons

# app/layout.tsx themeColor meta
app\layout.tsx:62   themeColor: '#0f172a'       — <meta> value, can't use CSS vars

# Amber semantic warning — deferred (no amber token)
components\OfflineStatusBanner.tsx              bg-amber-* / text-amber-*

# Hard exclusions (spec)
components\TeamDropdown.tsx                     (not touched per spec)

# Intentional exceptions
app\global-error.tsx   hex values intentionally REMAIN — this component
                       replaces the root layout; globals.css is NOT loaded,
                       so CSS custom properties resolve to nothing.
                       Colors are hard-coded to the dark theme: #0a0e1a, #f1f5f9, #d4a843, #94a3b8
```

---

## Verification Results

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ Exit 0, no errors |
| `npm run build` | ✅ Exit 0, all 14 pages built |
| Type check (part of build) | ✅ Passed |

---

## Deep Rules Reference
See [CLAUDE.md](../../CLAUDE.md) for architecture guardrails. This note intentionally does not duplicate that content.

# Pare — Product Vision & Architecture (v1)

_The comparison workspace vision. Read before building the home-accordion / compare-tabs feature._

## Screens

### Home (Schedule)
- Week switcher on top (‹ Week N ›, current-week default, weeks 1–18).
- The week's matchups as **accordion rows**. Tapping a row expands it **inline** to show an
  editable head-to-head mini-compare (quick peek, no navigation).
- Inside the expanded row: an **"Open full"** button → promotes this matchup into the Compare
  workspace as a tab and navigates there.
- **Top-right "+" button** (styled to match the design system) → create a new comparison by
  picking any two teams → opens as a new tab in the workspace.

### Compare workspace (the star)
- Holds **multiple comparisons as swipeable pages / tabs**. Swipe left/right to move between
  them; a tab/dot indicator shows where you are.
- Each tab = one 2-team head-to-head (Option A multi-compare — separate matchups, not 3+ teams
  in one).
- Close a tab. Opening a matchup that's already a tab **switches to it (no duplicates)**.
- Tablet/wider: can show tabs side-by-side or a grid; mobile is swipe-first.

### Bottom navigation
- **Home ↔ Compare** for v1. Extensible later (favorites, settings) — leave room.
- From a Compare page, the bottom bar returns to Home or switches to the tabbed workspace.

## Interactions / rules
- A comparison is created two ways: (a) Home matchup → "Open full" → becomes a tab;
  (b) top-right "+" → pick two teams → new tab. Both funnel into the same tab stack.
- **"Open full" PROMOTES the home peek into a tab** (one continuous workspace — decided;
  no separate full-page system).
- **Global state / single source of truth:** an edit made inline on Home shows on the full
  page and vice versa. One comparison = one state object wherever it's shown.

## State architecture (the foundation — build first)
- Move from today's single global A/B pair (at ComparePage) → a **collection**:
  `comparisons[]` (each: teamA, teamB, per-comparison settings like metrics/display mode) +
  an `activeId` pointer.
- Shared via a small **React context store** — this supersedes the current props-only rule in
  CLAUDE.md, so it needs an **ADR** (docs/adr/).
- **One reusable Compare component**, rendered in three places off the store: inline (accordion),
  full page, and per tab. Build it once; do not duplicate.

## Persistence
- Save open comparisons + active tab to **localStorage** (this is the real Next app — localStorage
  is fine here) and restore on load. This is the "keep comparing many teams" payoff.

## Scope / future
- **Tab count capped for v1** (e.g. ~8).
- Unlimited tabs + advanced features (favorites, saved comparisons, accounts) deferred to a
  future **SaaS tier**.
- Dark mode only. Mobile-first, swipe-based.

## Proposed build sequence (small, safe, verify-as-we-go — no browser self-checks)
1. **State foundation** — add the `comparisons[]` + `activeId` context store; migrate the
   existing single-pair compare to read/write it. ADR written. No visual change yet.
2. **Compare workspace shell** — swipeable multi-tab container that renders the existing Compare
   component per tab; tab/dot indicator + swipe + close.
3. **"+" create flow** — top-right button on Home → pick two teams → new tab.
4. **Home accordion** — matchup rows expand to an inline compare (reusing the Compare component);
   "Open full" promotes to a tab and navigates.
5. **Bottom nav** — Home ↔ Compare.
6. **Persistence** — localStorage save/restore of tabs + active tab.

_Last updated: 2026-09-14._

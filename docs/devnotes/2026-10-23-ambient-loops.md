# 2026-10-23 — #1 bar + Power Surge loop again (gated), ticker stops

Branch `perf/ambient-loops` (git worktree `..\Pare-ambient`, cut from `main` while Last-4 was
uncommitted). Plan: `docs/plans/performance-audit-i-dont-wise-clarke.md`.

## Why
Perf Pass 2 (`2026-10-03-compare-performance.md`) made every Compare effect play once and settle.
Kobe didn't like the #1 gold bar and the Power Surge electricity freezing — he wants both alive.
Flagged as *Strong* (an always-moving screen costs battery/heat, and §9.8 forbade it); his call:
**loop, but gated**, and cut other always-on motion to pay for it. Recorded in design-system §8 +
§9.8 as a deliberate exception.

## Audit (what animates)
Only two things ran forever on a resting screen: the Compare header ticker and (during live
games) the live dot. Everything else is load-only (skeleton shimmers, offline/PWA spinners),
plays once (#2–5 breathe, #32 ember, menu rows, My Team flash), or is already gated (live polls
skip a hidden tab; StormCrackle had IO + hidden-tab). Neighbor panes (±1) are mounted off screen,
so any new loop there had to pause.

## What changed
- `lib/ambientFx.ts` (new): module gate, no React state. `pauseAmbientFor('swipe' | 'scroll')`
  pauses; resumes 150 ms after the last event. Mirrors to `<html data-fx="paused">`, written only on
  a flip. Tests: `lib/__tests__/ambientFx.test.ts`.
- `CompareWorkspace.tsx`: track `x` change (drag, spring, tab tap) → `'swipe'`; capture-phase pane
  scroll → `'scroll'`. Phone pager only.
- `CompactPanel.tsx`: one IntersectionObserver per card sets `data-fx-off` on the DOM (no re-render).
- `globals.css`: `.pare-breathe-fast` = intro breath + `pare-glow-loop` (0.7 ↔ 0.35, starts at the
  intro's end value); `.pare-spark` iterations 3 → infinite; `.pare-fx-loop` paused under
  `:root[data-fx='paused']` or `[data-fx-off]`. `SplitCapsuleBar.tsx` adds the class (#1 only).
- `StormCrackle.tsx`: loops for good. Shared rAF for all storms, joined only while on screen;
  30 fps intro (4 s) → 20 fps; skips frames when hidden / ambient-paused; dt capped at 0.1 s after
  a pause. **No `shadowBlur`** — glow = 9× and 5× wide faint team-color strokes + body + white core;
  node glows = one pre-rendered sprite (was 7 radial gradients per frame); edge gradient cached per
  size and scaled with `globalAlpha`.
- `CompareTicker.tsx`: 3 passes (~9 s) per mount, then the static line (same as reduced motion).

## Verified
- `npm run check` clean; `npm run test:run` 52 files / 412 tests pass; `npm run build` passes
  (worktree, own `node_modules` — Turbopack rejects a junctioned one).
- Not yet seen on a device. Kobe to check on iPhone: #1 sparks/aura and storm keep running; they
  freeze mid-swipe/scroll and pick up right after; the new storm glow looks right; ticker stops.

## Open risks
- **Storm glow look changed** (fake glow vs real blur). Tune the 0.12 / 0.3 alphas and 9× / 5×
  widths in `strokeBolt` if it reads thinner or harsher.
- Idle Compare now has ongoing work again: 20 fps canvas per powered half + compositor loops for
  each #1 bar on screen. Ground truth = Safari Web Inspector Timelines, 30 s idle vs the Pass-4
  recording (how-to in `2026-10-03-compare-performance.md`).
- iPad quadrants: off-screen pausing works (observer), but scroll/drag pausing is only wired for the
  phone pager.
- Merge with Last-4: `CompactPanel.tsx` changed on both branches (imports + the `last4` dataset vs
  the card ref/observer) — expect a small, mechanical conflict.

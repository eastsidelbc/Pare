# Plan — Ambient loops for #1 bar + Power Surge, paid for by cutting everything else

## Context

Perf Pass 2 (2026-10-03, `docs/devnotes/2026-10-03-compare-performance.md`) made every Compare effect
**play on change, then settle**: the #1 gold bar (ring + sparks + fast breathe) runs ~5 s and freezes,
and StormCrackle (electricity) plays 4 s then stops its canvas loop. Kobe wants those two to **keep
going**. That reverses design-system §9.8 ("never an infinite loop on a resting screen") — flagged as
*Strong* (battery/heat on an idle screen); this plan keeps the loops but makes them cheap and gated,
and removes the other always-on motion to pay for it.

**Kobe's decisions (2026-10-23):** loop, gated (pause off-screen / background / mid-swipe-scroll) ·
swap canvas `shadowBlur` for a layered-stroke fake glow (look-check on iPhone) · ticker stops after
3 loops · work on a new branch `perf/ambient-loops`, cut after the Last-4 work is committed/merged
(start step: confirm `git status` is clean on `main` before branching).

## Audit — what animates today

| Thing | Where | Runs | Verdict |
|---|---|---|---|
| Compare header ticker (marquee) | `components/compare/CompareTicker.tsx` | **forever**, every Compare visit | **Stop after 3 loops → static line** |
| Power Surge canvas | `components/ui/StormCrackle.tsx` | 4 s then stops | **Loop (Kobe)**, made ~3–4× cheaper |
| #1 bar aura + sparks | `components/ui/SplitCapsuleBar.tsx`, `.pare-breathe-fast` / `.pare-spark` | ~5 s then stops | **Loop (Kobe)** |
| #2–5 bar breathe | `.pare-breathe` | 4.7 s then still | keep settling (gold/loop is #1's alone) |
| #32 ember | `.pare-ember` | 3.6 s then still | keep settling |
| Live dot | `.pare-live-dot` | forever, only during live games | keep (status signal, §9.8 exception) |
| Skeleton shimmers | `.skeleton`, `.pare-shimmer` | only while loading | keep |
| Offline-banner pulse, PWA spinner | `OfflineStatusBanner`, `PWAInstallPrompt` | only in those states | keep |
| Live polls | `useLiveScores`, `useMyTeamLive` | live window only, skip hidden tab | keep (already gated) |
| Neighbor panes (±1) | `CompareWorkspace` windowing | mounted off-screen | **their loops must pause** (new gate) |

## Approach

### 1. One "ambient FX" gate — `lib/ambientFx.ts` (new, tiny, no React state)
- Module store: `setAmbientPaused(reason: 'drag' | 'scroll', on: boolean)`, `isAmbientPaused()`.
- Mirrors to `document.documentElement.dataset.fx = 'paused'` so CSS can pause loops with **zero re-renders**.
- `CompareWorkspace`: track `onDragStart`/`onDragEnd` → `'drag'`; pane `scroll` (passive) → `'scroll'`,
  cleared ~150 ms after the last scroll event. Swipes and scrolls get the full frame budget; the
  effects resume the instant you let go.

### 2. Loops pause when not seen
- `CompactPanel`: one `IntersectionObserver` on the card root toggles a `data-fx-off` attribute (via ref,
  no re-render) → off-screen neighbor panes and cards scrolled away pause their CSS loops.
- CSS: `:root[data-fx="paused"] .pare-fx-loop, [data-fx-off] .pare-fx-loop { animation-play-state: paused; }`
- StormCrackle already has IO + `document.hidden`; add `isAmbientPaused()` to its skip check.
- `prefers-reduced-motion`: unchanged — global rule forces 1 iteration; storm draws the still glow.

### 3. #1 bar loops (`SplitCapsuleBar.tsx` + `app/globals.css`)
- Aura: existing intro breath, then a gentle infinite opacity loop chained in the same rule
  (`animation: pare-breathe 2.6s … 0.5s 1, pare-glow-loop 3s ease-in-out 3.1s infinite alternate`),
  class gains `pare-fx-loop`. Opacity-only on its own layer (`will-change` stays) → compositor-only.
- Sparks: iteration `3` → `infinite`, same staggered delays, `pare-fx-loop`. Transform/opacity only.
- Ring: stays static (it was never animated). `.pare-breathe` (#2–5) unchanged.

### 4. StormCrackle cheaper per frame (look-check needed)
- **Drop `ctx.shadowBlur`** (a Gaussian blur per stroke — the costliest canvas op, ~14 per frame):
  fake the glow with a wide low-alpha team-color stroke + mid stroke + thin white core.
- **Node glows**: pre-render one radial-gradient sprite per mount to an offscreen canvas, then
  `drawImage` with `globalAlpha` (today: 7 new gradients every frame).
- Cache the edge linear gradient per size (today: new one every frame).
- **FPS**: 30 for the 4 s intro burst, then **20** ambient (arcs only re-roll every 70–90 ms ≈ 12 Hz,
  so 20 fps loses nothing visible).
- **One shared rAF** for all storms (module-level ticker, subscribe/unsubscribe) instead of one per canvas.
- Remove the PLAY_S → settle → stop branch; keep `stillGlow` for reduced motion only.

### 5. Ticker stops after 3 loops (`CompareTicker.tsx`)
- `animation: ticker-marquee 3s linear 3` + `onAnimationEnd` → render the existing static line
  (same as the reduced-motion branch). Replays on remount (each Compare visit).

## Files
- new `lib/ambientFx.ts` (+ `lib/__tests__/ambientFx.test.ts`: reasons stack, paused until all clear)
- `components/ui/StormCrackle.tsx`, `components/ui/SplitCapsuleBar.tsx`, `components/mobile/CompactPanel.tsx`
- `components/compare/CompareWorkspace.tsx` (drag/scroll → gate; no change to windowing or springs)
- `components/compare/CompareTicker.tsx`, `app/globals.css`
- Docs: `docs/design-system.md` (§8 tier table + Power Surge para + §9.8 exception: "#1 bar + Power
  Surge loop, gated", Kobe's call 2026-10-23), `CHANGELOG.md` `[Unreleased]`, dev note
  `docs/devnotes/2026-10-23-ambient-loops.md`.
- Untouched: bar math, `useBarCalculation`, ranking, data layer, hook signatures.

## Verification
- `npm run check`, `npm run test:run` (new ambientFx test; `powerSurge.test.ts` still green).
- `npm run build` only after confirming port 4000 is free (memory: no build while dev runs).
- Kobe on iPhone: Compare with a #1 bar + a powered team → sparks/aura and storm keep running;
  swipe/scroll feels smooth and effects pause mid-gesture then resume; ticker stops after ~9 s.
- Optional ground truth: Safari Web Inspector → Timelines, 30 s idle on Compare, compare CPU/paint to the
  Pass-4 recording (target: no full-card repaints; idle CPU in the low single digits).

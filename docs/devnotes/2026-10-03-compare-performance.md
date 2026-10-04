# 2026-10-03 — Compare tab performance (Passes 1–4)

**Why:** Compare felt slow on iPhone (14 Pro): team swaps from the wordmark dropdown and the rank
badges stuttered, swipes between comparison tabs hitched. Goal: Sleeper-tier smoothness, mobile-first.

**How we measured (performance profiling)**
- *Sandbox benchmark* (Claude): prod build, Chromium at iPhone 14 Pro size (393×852 @3x, touch),
  CPU throttled 4x, fixture data, 4 tabs, median of 3 runs. Measures fps, dropped frames, longest
  freeze, tap→done time, React renders; plus a Chromium paint trace for repaint counts.
- *On-device profiling* (Kobe): Safari Web Inspector → Timelines on the real iPhone, exported as a
  JSON timeline recording and analyzed frame by frame. Ground truth for GPU/paint costs, which
  Chromium can't reproduce. How-to: iPhone Settings → Apps → Safari → Advanced → Web Inspector ON;
  Mac Safari → Settings → Advanced → "Show features for web developers"; cable; Develop → iPhone →
  pare.gg → Timelines → record → Export.

## Root causes found
1. `@number-flow/react` rolling stat numbers: 20 per screen, each re-measured the page on a swap
   (~375ms forced layout). Biggest swap freeze.
2. Every closed rank badge mounted a full Floating UI menu + 32-team ranking (20/pane, 60 with
   neighbors); an inline `onDropdownToggle` arrow broke row memo → opening one menu re-rendered all rows.
3. StormCrackle (Power Surge) canvas drew forever (~1/3 of idle CPU).
4. Rank-tier CSS effects looped forever → style work every frame on a resting screen.
5. Full-screen `backdrop-filter` blur behind menus and the bottom nav.
6. Menus: 33 framer-animated rows.
7. Compare re-downloaded stats on every visit (skeleton flash) although Home already had them.
8. Swipe: the next neighbor pane was built mid-slide.
9. `useIsMobile` started `false` → phones built the iPad 2×2 grid first, then threw it away.
10. (device recording) Animated glows weren't on their own GPU layer → Safari repainted the whole
    card area ~7×/s for the ~5s effect window after every change (50–100ms frames).

## What changed
- **Pass 1** (`bfcb416`): numbers are plain text, dependency removed (Kobe's call); rank menus mount
  only while open, explicit idempotent `onClose` (fixes a double-toggle reopen); stable toggle
  handlers; `components/NflStatsProvider.tsx` = one app-wide stats copy (Home + Compare), silent
  foreground refresh after 10 min (`useNflStats` keeps data on refresh/error).
- **Pass 2 + 3** (`8e3117d`, `fddc233`): effects **play on change, then settle** (finite CSS bursts,
  replayed via `SplitCapsuleBar effectKey` + `RankBadge key`); aura hidden while the bar slides;
  StormCrackle plays 4s → still glow → loop stops; menus get a plain dim + CSS row stagger
  (`.pare-row-in`); pane windowing follows `settledIndex` (startTransition after the spring);
  `useIsMobile` via `useSyncExternalStore`.
- **Pass 4** (`perf/compare-pass4`): `will-change` on every animated effect (own GPU layer); #32 ember
  pulses an `::after` opacity (box-shadow never animates); bar meeting-point divider static
  (opacity 0.9, Kobe OK'd); stat rows `contain: layout`; bottom-nav blur removed — the nav is 94%
  opaque, pixel diff with vs without = max 2/255 (invisible), but it re-blurred content every frame.

## Results (sandbox, 4x CPU throttle)
| Interaction | Before | Pass 1 | Pass 2+3 | Pass 4 |
|---|---|---|---|---|
| Resting screen | ~53 fps | 55 | 60 | 60 |
| Team swap (wordmark) | 12 fps, 977ms | 42, 388ms | 49, 271ms | 54, 239ms |
| Open team menu | 30 | 32 | 45 | 45 |
| Rank menu open | 22 | 37 | 46 | 48 |
| Team swap (rank badge) | 35 | 47 | 50 | 52 |
| Swipe | 40, 250ms worst | 48 | 54, 50ms | 56 |
| Home → Compare | refetch + skeleton | 0 API calls, ~176ms | — | — |

Paint trace, 5s after a swap: repaints in seconds 2–5 dropped from 120/s to 0 (Pass 4).
Device recording before Pass 4: settled idle ~2.5% CPU and ~0 paint; JS only 84ms of 2062ms main
thread — the remaining cost was paint/composite, which Pass 4 targets.

## Decisions & deliberately not done
- Bars still animate `width` (switching to transforms would distort the split-capsule borders/glow).
  Revisit only if the device still shows a swap hitch.
- Header ticker marquee still loops (compositor-only, cheap) — option: stop after 3 loops.
- Other screens still use backdrop blur (FantasyBoards, OfflineStatusBanner, PWAInstallPrompt).
- npm audit on the Mac mini reported 17 vulnerabilities (1 critical) — review separately, never `--force`.

## Next
Re-record on the iPhone after Pass 4 deploys. Success = ~0 full-area repaints during effect windows
(was 101 in 32s) and swap frames well under the old 50–100ms.

Full findings + history: Claude project doc `claude/perf-audit-compare-2026-10-03.md`.

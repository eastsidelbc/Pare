# Pare — Global app-shell scroll: fixed chrome, only content scrolls

Layout/CSS fix, applied consistently across screens. Dark mode, mobile-first. Don't touch
data/ranking. NO browser/screenshot verification — Kobe checks it.

## Goal
Make the app behave like a native shell: header and footer are FIXED; only the middle
content scrolls. Fixes the current bug where the compare content (defense) is cut off and
unreachable, and pulling down triggers a full-page refresh/bounce instead of scrolling.

## Rules
- App is a fixed-height column at 100dvh. The page/body itself does NOT scroll: set
  `overflow: hidden` on the shell and `overscroll-behavior-y: none` on html/body to kill
  browser pull-to-refresh/bounce.
- FIXED header (title row + comparison-tabs pill on Compare; schedule header on Home) at top.
- FIXED footer nav (the floating pill) at bottom.
- The ONLY scrollable region is the content between them:
  `flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
   -webkit-overflow-scrolling: touch;`
  - On Compare: the offense/defense comparison cards. EACH compare tab/pane owns its own
    vertical scroll container (so defense is reachable and scroll position is per-tab).
  - On Home: the schedule list scrolls; its header + the footer stay fixed.
- Add bottom padding to the scroll region equal to the floating footer height + safe-area
  inset so the last card (defense) isn't hidden behind the footer; offset the top below the
  fixed header.

## Horizontal swipe vs vertical scroll (do NOT break the swipe)
- The tab pager drags on the X axis only — use Framer Motion `drag="x"` with
  `dragDirectionLock` (axis lock) so a mostly-vertical gesture scrolls the content and a
  mostly-horizontal gesture swipes tabs.
- Set `touch-action: pan-y` on the vertical scroll container so vertical scrolling is native
  and smooth; the pager owns horizontal. Both gestures must work.

## Verify (cheap only — no browser)
1. npm run build clean.
2. Confirm structurally: body/html not scrollable (overscroll-behavior none), a single
   flex column with fixed header + footer, and one `overflow-y:auto` content region per
   compare pane (and on Home). List the files/classes changed.
Kobe will confirm on device: full defense reachable by scrolling, header/footer stay put,
tab swipe still works, no page bounce/pull-to-refresh.
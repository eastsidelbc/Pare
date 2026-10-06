# 2026-10-06 — Swipe-down bottom sheets + favorites logos

## What (Kobe's ask)
1. Bottom sheets close by **swiping them down**, not only by tapping outside — for every sheet
   (team quick menu from Standings, the Home "Your teams" picker).
2. Favorites show **logos**: the Home star picker, and the "Manage order & display" screen (/teams).
3. "Manage order & display" moves to the **top** of the picker.

## How
### `components/ui/BottomSheet.tsx` (new, one source for sheets)
- Backdrop (tap = close) + sheet sliding up on the same spring as before (380 / 36). Look
  unchanged: `--card-deep-mid`, `--glass-edge` top edge, `--radius-xl` top corners, `--shadow-pop`.
- framer-motion `drag="y"`, constraints top 0 / bottom 0 with elastic `{ top: 0, bottom: 1 }` →
  follows the finger down only, springs back unless released past the close rule:
  `shouldCloseSheet(dragY, velocityY, height)` = past **25%** of the sheet height **or** a flick
  over **500 px/s** (pure, `lib/__tests__/bottomSheet.test.ts`).
- `grab="sheet"` (quick menu — short, nothing scrolls): the whole sheet drags; taps on its
  buttons still work (drag starts only after movement).
- `grab="header"` (Your teams picker — the 32-team grid scrolls): drag starts only from the
  grabber + `header` (via `useDragControls`, `touch-action: none` on that zone). A whole-sheet
  drag would take the vertical swipe from the list (framer sets `touch-action: pan-x`), so the
  grid keeps native scroll. Same model as iOS sheets.
- Exit after a swipe animates from where the finger let go (AnimatePresence `exit: y 100%`).
- `TeamQuickMenu` keeps the last team in a ref so the sheet still has content while it slides
  out (`quickTeam` is already null by then).

### Favorites logos — new `favorites` surface
| Where | File | Logo |
|---|---|---|
| Home star picker chips (44px) | `favorites/TeamGrid.tsx` | 24, replaces the abbr; ★ stays beside it |
| First-launch tiles (64px, same grid) | `favorites/TeamGrid.tsx` `variant="tile"` | 30, nickname under it |
| /teams your-team rows (60px) | `favorites/YourTeamsScreen.tsx` | 34 in the old 50px slot |
| /teams add-search results (44px) | `favorites/YourTeamsScreen.tsx` | 24 in the old 40px slot |

All `decorative` (the chip/button aria-label or the visible full name already names the team).
Name mode = the old markup, untouched (TeamIdentity returns its children). Switch rules:
`docs/devnotes/2026-10-06-team-logo-switch.md`.

### Picker layout
"Manage order & display" now sits under the title (above the hint + grid) inside the drag
header, so it's visible without scrolling.

## Verification
- `npm run check` ✓ · `npm run test:run` 121 ✓ (4 new: close rule).
- Not run here: the gesture on a real phone (Kobe) — swipe the quick menu anywhere, swipe the
  picker from its top area, and check the grid still scrolls.

## Notes / follow-ups
- First launch also gets logos (it reuses `TeamGrid`) — set `favorites: 'name'` to undo all
  favorites logos at once.
- Not on a sheet yet: `PWAInstallPrompt` (off on pare.gg) and `FirstLaunch` (full-screen, not a
  sheet) — move to `BottomSheet` if they become sheets.
- No Escape-key close on sheets yet (desktop/keyboard) — small follow-up in `BottomSheet`.

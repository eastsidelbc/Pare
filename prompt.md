# Pare — Tighten pass: compact chrome + bigger, transparent team logos

Styling/CSS only — no logic, no data, no ranking changes. Dark mode. Keep the header and
footer FIXED per the app-shell scroll rule. NO browser/screenshot checks — Kobe verifies.

## Changes
1. Footer nav pill (global): make it smaller/less bulky — reduce height and padding. Keep
   the actual tap area ≥44px (shrink the visual pill, not the touch target).
2. Compare header: shrink the "Compare" title font size and tighten the title area
   (less height/vertical padding) so it's compact.
3. Comparison-tabs section: reduce the padding/margins of the wrapper AROUND the tabs pill
   (less "cushion"), so the pill sits tight, not floating in a big padded box. Keep the
   pills themselves skinny.
4. Team logos on the Compare page: increase their size so they fill their corner/slot
   instead of sitting small in it; remove excess padding around them.
5. Team logo background: remove the dark background tile behind each logo — make that
   container transparent so the logo reads as a clean, seamless button on the surface.

Keep everything on the existing design tokens and consistent spacing. Don't change the
fixed-header/footer scroll behavior we just set.

## Verify (cheap only)
- npm run build clean; list the files/classes changed.
Kobe checks on device: tighter header/footer/tabs, bigger logos, no dark box behind logos.
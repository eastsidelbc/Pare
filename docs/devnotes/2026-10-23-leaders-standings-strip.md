# 2026-10-23 — Leaders: division standings strip

Branch `feat/leaders-standings`. Plan: `docs/plans/pasted-content-id-fcbb-the-prop-deep-crescent.md` (Phase B).

## Why
Kobe wanted standings on Leaders, below the "Pare Leaders" bar and before Fantasy TOT/PPG.
He picked a compact strip (not the full division tables) so Fantasy stays near the top.

## What changed
- `components/leaderboards/DivisionStrip.tsx` (new, server component): one `ListCard` per
  division (NFC → AFC, ESPN order), 4 × 24px rows of `TeamAbbr` + W-L (W-L-T only when that team
  has a tie), leader row `--leader-tint`. Sideways scroll with snap, edge bleed, `touch-action:
  pan-x pan-y` (the page's `<main>` is `pan-y`). Each card is a link to `/standings` with an
  aria-label that reads the whole division. Hidden when every division is empty.
- `lib/standings.ts` — `getStandingsCached()`: `unstable_cache` (60s, tag `standings`) around
  the existing no-store `fetchStandings`, inside the same `liveWithLastGood` backup. Why not
  `getStandings()`: a no-store fetch in an ISR page turns the page dynamic. Why not a cached
  fetch: Next drops the timeout signal when it refreshes a cached fetch during ISR (CLAUDE.md
  Freshness). No nested caches. `/standings` keeps `getStandings()` (live).
- `app/leaderboards/page.tsx` — fetched in the same `Promise.all`; strip is the first child of
  the scroll region. No JumpNav entry (the strip is at scroll 0; a sixth link would crowd 393px).
- Docs: design-system §9.3 page order + recipe row; CLAUDE.md freshness row.
- `components/standings/*` untouched (import only).

## Verified
- `npm run check` clean; `npm run test:run` all pass, incl. new `lib/__tests__/divisionStrip.test.ts`
  (one link per division, aria-label, W-L-T only with a tie, one leader tint, hidden when empty).
- Dev (:4000) `/leaderboards` renders 8 division cards with live data
  ("NFC North standings: MIN 5-0, CHI 5-2, GB 4-2, DET 3-2").
- Not run: `npm run build` (dev holds :4000). Before merge: stop dev, `npm run build`, and check
  the route table still lists `/leaderboards` as ISR (5m).
- UI: Kobe to check at 393px.

## Risks
- ~~Up to ~6 min stale~~ — corrected after the first build: Next takes the shortest timer on a page, so the strip's
  60s cache pulled `/leaderboards` to a **1-min** ISR window (route table `1m`). Standings ≤ ~2 min behind; one ESPN
  standings call per minute while the page is in use; board data stays cached 30 min. Kobe kept 1 min (2026-10-23).

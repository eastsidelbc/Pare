# Pare — Fix production build (ESLint errors blocking `next build`)

`npm run build` fails on these ESLint ERRORS. Fix ONLY the errors below (warnings/unused-vars
don't block the build — leave or clean at your discretion). Surgical, preserve behavior.

## The real one (fix carefully)
- components/mobile/CompactComparisonRow.tsx (lines ~93, 98, 104): `useRanking` and
  `useBarCalculation` are called CONDITIONALLY / after an early return — violates rules-of-hooks.
  Fix by moving these hook calls ABOVE any early return so they always run in the same order
  every render; guard the *logic/values* inside instead of skipping the hook call. Do not change
  what the row displays.

## Type + escape errors (replace `any` with a proper type — or `unknown` + narrowing — not a blind cast)
- components/FloatingMetricsButton.tsx: lines 51, 57, 109
- components/RankingDropdown.tsx: line 169
- lib/metricsSelectorPreload.ts: lines 8, 16
- lib/useOfflineStatus.ts: lines 40, 41, 42
- lib/usePWA.ts: line 60
- components/OfflineStatusBanner.tsx: line 38 — escape the apostrophe (&apos;).

## Verify (cheap only)
1. `npm run build` completes with NO errors (warnings OK).
2. Confirm CompactComparisonRow renders the same as before (hooks now unconditional).
List files changed.
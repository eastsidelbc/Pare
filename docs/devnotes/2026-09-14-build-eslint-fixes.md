# Dev Note — 2026-09-14 — Fix production build (ESLint errors)

> Rules live in `CLAUDE.md`; rationale only here. Surgical, behavior-preserving.

## Context
`npm run build` failed on ESLint ERRORS (rules-of-hooks, `no-explicit-any`,
unescaped entity). Warnings/unused-vars don't block the build and were left.

## Fixes
- **Rules-of-hooks** (`components/mobile/CompactComparisonRow.tsx`):
  `useRanking` (×2) and `useBarCalculation` were called AFTER an early return, so
  they ran conditionally. Moved all three hook calls ABOVE the early return; they
  now always run in the same order. The values they consume are computed
  null-safely first (`teamAData?.[…]`, a neutral `higherIsBetter` fallback,
  `metricConfig?.name ?? ''`), and the `if (!metricConfig || !teamAData ||
  !teamBData) return null` bail-out now sits AFTER the hooks. Displayed output is
  identical (same formatting, same "—" handling, same bars).
- **`no-explicit-any` → proper types / `unknown` + narrowing** (no blind casts):
  - `FloatingMetricsButton.tsx`: `IdleWindow` interface for `requestIdleCallback`/
    `cancelIdleCallback`; `window.visualViewport?.height` (typed DOM).
  - `RankingDropdown.tsx`: `window.visualViewport?.height`.
  - `lib/metricsSelectorPreload.ts`: `Promise<typeof import('…/MetricsSelector')>`.
  - `lib/useOfflineStatus.ts`: `NetworkInformation` + `NavigatorWithConnection`.
  - `lib/usePWA.ts`: `Navigator & { standalone?: boolean }` for iOS.
- **Unescaped entity** (`components/OfflineStatusBanner.tsx`): `You're` → `You&apos;re`.
- **Latent prerender blocker**: after ESLint passed, the build reached prerender
  and failed with `Cannot find module 'critters'` (required by
  `experimental.optimizeCss` in `next.config.ts`). Installed `critters`
  (dev dep) — preserves the intended CSS optimization rather than disabling it.

## Files
- `components/mobile/CompactComparisonRow.tsx`, `components/FloatingMetricsButton.tsx`,
  `components/RankingDropdown.tsx`, `components/OfflineStatusBanner.tsx`,
  `lib/metricsSelectorPreload.ts`, `lib/useOfflineStatus.ts`, `lib/usePWA.ts`,
  `package.json` (+ lockfile: `critters`).

## Testing
- `npm run build` → exit 0, all 10 pages generated, NO errors (warnings only).
- CompactComparisonRow render verified unchanged by inspection: identical JSX,
  same value/rank formatting and bar visibility; only the hook call site moved.

## Confirmation
I will not duplicate CLAUDE.md content in Dev Notes; I will link to it.

# Dev Note — 2025-10-27: Phase 4 Wrap, Flicker Investigation, and Fixes

Date: 2025-10-27  
Branch: docs-refactor  
Scope: Phase 4 finalization, temporary instrumentation for MismatchChips flicker, build fixes, and UI polish

---

## Context
We completed Phase 4 (mock live data) wiring and QA, then investigated a UI flicker where MismatchChips showed “ghost pills” briefly when switching games in the rail. We added temporary logging, captured traces, implemented a minimal fix, verified behavior, and removed the instrumentation.

---

## Changes

### Build/runtime
- Moved `'use client'` to the top of client modules to satisfy Next 15:
  - `components/CompareHeader.tsx`, `components/SelectionContext.tsx`, `lib/hooks/useScoreboardMock.ts`
- Made `lib/logger.ts` browser-safe (lazy require `fs/path` on server only) to fix build error when imported from client.

### Temporary instrumentation (added then removed)
- Added `logDebug` utility (`lib/logger.ts`) and wrote to `logs/debug/ui-flicker.log` (console mirrored).
- Instrumented renders, selections, polls, and API route:
  - `MismatchChips.tsx`, `CompareHeader.tsx`, `ScoreboardRail.tsx`, `SelectionContext.tsx`, `useScoreboardMock.ts`, `app/api/mock/matchup/route.ts`.
- Verified logs were produced; then removed all logging imports and calls.

### UI fix — ghost pills
- `components/MismatchChips.tsx`:
  - Clear previous chips on fetch start.
  - Gate skeleton vs chips (mutually exclusive render).
  - Use stable keys per selection (`${away}-${home}-${text}`) to prevent DOM reordering.

---

## Files Touched (key)
- `components/MismatchChips.tsx` — skeleton/chips gating, stable keys
- `components/CompareHeader.tsx` — directive placement; removed logs
- `components/ScoreboardRail.tsx` — removed click logs
- `components/SelectionContext.tsx` — directive placement; removed logs
- `lib/hooks/useScoreboardMock.ts` — directive placement; removed timing/logs
- `app/api/mock/matchup/route.ts` — removed logs
- `lib/logger.ts` — browser-safe logger (kept for future investigations)

---

## Testing
- Rapidly clicked through multiple rail matchups; verified chips no longer display ghost pills.
- Confirmed header and rail skeletons behave correctly on initial load only.
- Build succeeds without module resolution errors (no `fs` on client).

---

## Decisions
- Keep logger utility file for future targeted debugging, but keep imports removed in production code.
- Maintain chips fix permanently; no behavior change beyond eliminating transient visual artifacts.

---

## Follow-ups
- Optional: add a small debounce to chips fetch on very rapid selection changes (not necessary after gating).
- Next phase: explore service-layer adapters to replace mocks without changing UI contracts.

---

## Commits (today)
- chore(debug): add temporary instrumentation for InsightPills flicker per prompt2 (no logic changes)
- fix(runtime): move/place 'use client' first in client modules
- chore(debug): make logger browser-safe by lazily requiring fs/path on server only
- fix(ui): eliminate mismatch ghost pills by clearing chips, gating skeleton, and using stable keys
- chore(debug): remove temporary logging across chips/header/rail/selection/polling/API

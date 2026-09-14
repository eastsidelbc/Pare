# Architecture Decision Record (ADR)

Note: Normative rules live in `CLAUDE.md`. This ADR records a change to one of them.

## Title
ADR: Comparisons collection store (multi-comparison foundation)

## Date
2026-09-14

## Status
Accepted

## Context
`CLAUDE.md` codified a hard guardrail: **global team selection lives at
`app/compare/page.tsx` only, as props flowing down, no external state library.**
That was correct for a single head-to-head pair.

`VISION.md` now calls for a **Compare workspace with multiple comparisons as
swipeable tabs**, a Home accordion that edits the same comparison inline, and
localStorage persistence. A single `selectedTeamA/selectedTeamB` pair at the
page can't represent "many comparisons + which one is active", and the vision
explicitly requires **one comparison = one state object shown in multiple places**
(inline peek, full page, tab) — which props-from-one-page can't provide.

## Decision
Introduce a small **React Context store** (`components/ComparisonsProvider.tsx`,
backed by pure logic in `lib/comparisons/store.ts`) holding
`comparisons: Comparison[]` + `activeId`, exposed via a `useComparisons()` hook.
The existing compare page now reads/writes the **active comparison** instead of
local `useState`. This **supersedes** the "single global pair, props-only" rule
for team/comparison selection. No external state library is added (Context only).

`Comparison = { id, teamA, teamB, settings: { offenseMetrics, defenseMetrics } }`.
`MAX_COMPARISONS = 8` (config/constants.ts), enforced in `addComparison`.

## Consequences
- Backbone for tabs/accordion/persistence is in place with **zero UI/behavior
  change today** (collection holds exactly one seeded comparison).
- Per-comparison metric selections are now first-class (each future tab keeps its
  own metrics). Display mode stays per-panel (unchanged) until a later step.
- The CLAUDE.md guardrail "global team state at ComparePage only" is narrowed:
  team/comparison state now lives in the provider. Data fetching, client-side
  ranking, bar math, and self-contained panels are **untouched**.
- Pure list operations are unit-testable without React.

## Alternatives Considered
- **Keep props-only, lift more state into ComparePage** — can't share one state
  object across Home-inline + full page + tabs; dead-ends the vision.
- **External state library (Zustand/Redux)** — overkill for one small collection;
  violates the "no external state library" spirit; Context is enough for v1.
- **URL/query params as source of truth for many tabs** — awkward for N tabs +
  per-tab settings + persistence; deep link stays supported, but isn't the store.

## Links
- Dev Note: `docs/devnotes/2026-09-14-comparisons-store.md`
- Vision: `VISION.md` (State architecture → build sequence step 1)
- CLAUDE: `CLAUDE.md#-hard-guardrails-never-violate` (Architecture → "Global team
  state at ComparePage only" — superseded for comparison selection by this ADR)
- Code: `components/ComparisonsProvider.tsx`, `lib/comparisons/store.ts`,
  `app/compare/page.tsx`, `config/constants.ts` (`MAX_COMPARISONS`)

# ADR: Prop engine v2 ships as data rows only; new prop rules must win out-of-sample

## Date
2026-10-23

## Status
Accepted

## Context
Kobe asked for prop leans tailored to the stat, the position and the opponent (what a defense allows to RBs /
WRs / TEs and to each role — WR1, RB1 …), with more formulas than v1's "3 signals, all agree", and a real
backtest + out-of-sample test. v1 loses money at the book's prices (2025 −2.7%, 2024 −5.6% after the A0 data
fixes). Any new rule that looks good only on the season it was tuned on would mislead users.

## Decision
1. **Ship gate for any prop rule:** tune on one season, grade once on a held-out season against a
   pre-registered gate (≥ 50 decided bets, hit % above the average break-even of the prices bet, ROI > 0,
   walk-forward ROI ≥ 0), and report — not gate — whether it beat "always this side" (Kobe: "ship but label it"),
   its p-value, and the passes expected from luck.
2. **v2 result → data rows only.** On 2025, 5 of 36 rule tests passed vs ≈ 9.9 expected from luck alone, so no v2
   lean ships (Kobe's call, 2026-10-23). The prop screen shows the v2 facts + the defense-vs-role and
   similar-defenses history as "Matchup data · info only"; the v1 lean pill stays as it was.

## Consequences
- The Leans tab gains matchup depth (role history, per-role allowance, usage, implied points) without
  claiming an edge it doesn't have.
- `PROP_V2_FROZEN` / `PROP_V2_SHIP` stay in `lib/leans/config.ts` as the grade's record; `PROP_V2_SHIP` isn't
  wired. Re-grading on 2026 (a new held-out season) is the path to ever shipping a v2 lean.
- The bundle grows by ~3.7 KB gzipped for two teams (`tables`).

## Alternatives Considered
- Ship the 3 units the gate passed (WR rec / TE rec / WR rec-yd unders), labelled — rejected: total passes were
  below chance, and the biggest one barely beat "always under".
- Replace v1 with v2 everywhere — rejected for the same reason.

## Links
- Dev notes: `docs/devnotes/2026-10-23-prop-engine-v2.md`, `docs/devnotes/2026-10-23-leans-data-fixes.md`
- Report: `docs/devnotes/2026-10-23-prop-engine-v2/report-2025.md`
- Pre-registration: `docs/plans/2026-10-23-prop-engine-v2/preregistration.md`
- Plan: `docs/plans/pasted-content-id-fcbb-the-prop-deep-crescent.md`
- CLAUDE: `CLAUDE.md` → Data → Leans

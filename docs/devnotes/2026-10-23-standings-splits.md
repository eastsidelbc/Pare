# 2026-10-23 — Standings: Splits view (Wave B4)

Branch `feat/data-rollout` · rollout plan [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md) (catalog "next" #10)

## Why

The standings response we already fetch (`no-store`) carries home / road / division / conference records and clinch
marks; Pare showed only W-L, PCT, PF/PA and streak.

## What changed

- `lib/standings.ts`: `TeamStanding` + `homeRecord`, `roadRecord`, `confRecord` (record stats are keyed by `type`:
  home / road / vsconf), `clincher` (`clincher` stat, late season), `gamesBehind`. **GB is computed** per division
  (`withDivisionGamesBehind`: ((leader W − W) + (L − leader L)) / 2 vs ESPN's first team): ESPN's default-level
  `gamesBehind` is measured against the **conference** leader (BUF showed 0.5 while leading the AFC East).
  `mapEntry` / `EspnEntry` exported for tests.
- `components/standings/SplitsTable.tsx` + "Splits" in the view toggle; `ClinchMark` in `TeamRow` (+ aria).
  `ROW_BASE`, `Num` exported from `StandingsRow` for reuse.

## Verification

- `lib/__tests__/standingsMap.test.ts` on live 2026 AFC East entries: BUF home 2-1 / road 3-0 / conf 3-1; division GB
  BUF — · NE 1.5 · NYJ 3 · MIA 4.5 (= ESPN's level=3 numbers, ≠ its default conference GB 0.5/2/3.5/5).
- Playwright at 393px: Splits shows 32 rows, tie records ("1-0-1") fit, no horizontal scroll, header toggle buttons
  all ≥ 30px wide (44px hit via `pare-hit44`); screenshot reviewed.
- `npm run check`, `npm run test:run`.

## Risks / open

- Clinch marks untested on real data until ESPN publishes them (December); the mapper reads `clincher.displayValue`.

## Addendum (same day) — LUCK column

- `SplitsTable`: 8th column LUCK = `pythagLuck(wins, games, PF, PA, ties)` (lib/formulas/team.ts, exponent 2.37 from
  `FORMULA_CONFIG`), `signedLuck` rounds the magnitude first (symmetric ±0.75 → ±0.8, no "−0.0" — both caught in
  review/tests). Footnote under the view explains GB and LUCK. Fits 393px (screenshot reviewed, no horizontal scroll).

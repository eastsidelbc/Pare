# Compare stats picker: Select all + no limit (2026-10-23)

Branch `feat/prop-engine-v2`. Follows `2026-10-23-compare-metrics.md` (Wave B3 picker).

## Why
Kobe wanted every stat on a Compare card without tapping them one by one; the 8-per-card cap
(`MAX_PANEL_METRICS`) blocked that.

## What changed
- `components/compare/MetricPickerSheet.tsx`
  - `MAX_PANEL_METRICS` removed; `toggleMetric` keeps only the "never below 1" rule.
  - New pure `selectAllMetrics(selected, fields)` — already-picked stats keep their order, the rest follow in list order.
  - "Select all" checkbox row above the first category. Ticked when every listed stat is on; unticking resets to
    `DEFAULT_OFFENSE_METRICS` / `DEFAULT_DEFENSE_METRICS` (can't clear to 0 — min is 1).
  - Header count now reads "N of <available> picked"; disabled/dimmed rows gone. Checkbox markup moved into a local `CheckBox`.
- `lib/__tests__/metricPicker.test.ts` — limit test replaced with "no upper limit" + select-all ordering.
- `docs/design-system.md` picker note updated.

No change to persistence (`lib/comparisons/persist.ts` never clamped the metric arrays) or bar math.

## Verified
`npm run check` clean; `vitest run lib/__tests__/metricPicker.test.ts` 3/3 pass. UI not checked in a browser (Kobe checks).

## Open risks
- All stats = 33 offense / 20 defense rows on one card — a long scroll on a phone, and the tablet quadrant cards get tall.
  Deliberate (Kobe's ask); defaults stay at the short list.

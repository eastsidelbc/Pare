# 2026-10-23 — Leans: green ▲ / red ▼ arrows on prop lines

Branch `feat/leans-arrows`. Plan: `docs/plans/pasted-content-id-fcbb-the-prop-deep-crescent.md` (Phase C).

## Why
Kobe asked for colored arrows in place of the "o" / "u" letter on Leans prop lines. A lowercase
"o85.5" is easy to misread at 11px; an arrow reads at a glance.

## What changed
- `lib/leans/format.ts` — `lineShort()` (string "o85.5") replaced by `propLineParts()` →
  `{ dir: 'over' | 'under' | null, text }`. Anytime TD → no arrow, "TD yes" / "TD no".
- `components/leans/PropLine.tsx` (new) — filled lucide `Triangle` (0.62em, rotated for under),
  `var(--green)` over / `var(--red)` under, wrapped in `role="img" aria-label="over|under"` so the
  accessible text is "over 85.5" (also inside the PropRow link's name).
- `components/leans/PropRow.tsx` (list row "▲85.5 rush yds") and `PropCard.tsx` (17/800 line on the card).
- `docs/design-system.md` §9 — amendment recording the deliberate exception to "red = live / bad
  rank": red ▼ = under, prop lines only, always next to the number and paired with green ▲.

Not changed (by choice, Kobe picked prop lines only): lean pills (gold, own arrow), "Over in 3 of
last 4" summaries, game totals "O/U 44.5".

## Verified
- `npm run check` clean; `npm run test:run` 70 files / 536 tests pass, incl. new
  `prop: line arrow` in `lib/leans/__tests__/leansRender.test.ts` (over → green, under → red +
  rotate, no "o85.5" / "u6.5" left).
- `node scripts/leans-gates.mjs l3 / l5 / l6` — all static checks pass; the build step skipped
  because `npm run dev` holds :4000.
- UI: Kobe to check `/leans` + a prop screen at 393px on :4000.

## Risks
- Red ▼ next to a red live dot could be read as "live"; kept apart by shape (triangle vs 6px dot +
  clock) and by place (prop lines vs game cards).

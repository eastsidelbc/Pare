# 2026-10-23 — Leans "Market" card + Home closing-line fix (Wave B1)

Branch `feat/data-rollout` · rollout plan [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md)
· why facts-only: [`2026-10-23-leans-backtest.md`](2026-10-23-leans-backtest.md)

## Why

ESPN's Core odds already carry open + current spread/total/moneyline, and the summary carries pregame weather —
we read only one closing line. The backtest showed Pare's own projections don't beat closing lines, so this card
shows **what the market says** (true by construction) rather than a Pare "edge".

## What changed

- `lib/espnCoreOdds.ts` (new): Core odds types + `pregameBook` — first non-"Live" book with a spread, else a
  total-only book. Shared by Home and Leans.
- `lib/schedule.ts`: closing-odds fallback uses `pregameBook` instead of `items[0]` (**bug fix**: on the 2025 final
  KC @ DAL, `items[0]` was DraftKings with no `details` → no line; the third book, "ESPN Bet - Live Odds", holds
  in-game prices like DAL −4.5 / +2000).
- `lib/leans/market.ts` (new, pure): `parseMarket(odds, summary)` → home spread / total / moneylines open →
  current, no-vig win chance, key-number hits, weather (temp, gusts, precip), venue + surface; `moved`, `parseLine`.
- `lib/leans/marketServer.ts` + `GET /api/leans/market?event=ID` (Leans route rule ok): one shared copy per game
  for 5 min, last good on failure, 5s timeouts; a summary failure keeps the lines.
- `lib/leans/client.ts`: `fetchGameMarket` / `useGameMarket` (same in-memory memo as the bundle).
- `components/leans/MarketCard.tsx` (new) under Game lines in `GameView` (optional `market` prop); `GameScreen`
  fetches it by `espnEventId`. Design-system §9.5 note added.

## Verification

- `lib/leans/__tests__/market.test.ts` (10) on trimmed real fixtures (`core-odds-upcoming.json`,
  `core-odds-final.json`): book choice skips total-only + Live books; DAL @ PHI −3 → +4.5 (moved 7.5 toward DAL),
  48.5 → 44.5, no-vig 65.7% / 34.3%, total near 44, 59° · gusts 12 · 0%; card copy rows.
- Live on :4000: `/api/leans/market?event=401873009` matches the fixture; the 2025 final now reads ESPN BET
  (KC −3.5, 62.7%); `?event=abc` → 400.
- Screenshot at 393px of `/leans/2026-w7-PIT-NO` reviewed: fixed a wrapping label and run-together key numbers.
- `npm run check`, `npm run test:run`, leans copy test (no banned words / book names).

## Risks / open

- 2 ESPN calls per game opened (cached 5 min, shared by all users).
- Weather is pregame only and absent for domes/international some weeks — the row just hides.
- The spread label reads the home team's line; "toward X" names the side the market moved to.

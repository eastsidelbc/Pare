# 2026-10-23 — Home: live down & distance (Wave C2)

Branch `feat/data-rollout` · rollout plan [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md) (Wave C "live drive tracker", smallest useful slice)

## Why

The live scoreboard Pare already polls every 5 s carries the game situation (down, distance, ball, red zone); the card
showed only the clock.

## What changed

- `lib/schedule.ts`: `GameSituation` + optional `Matchup.situation`.
- `lib/espnScoreboard.ts`: `mapSituation` (exported, pure); set only for `state === 'in'` and only when it has content
  (so the P0 live-parity snapshot stays byte-identical). `EspnTeamRef.id` added for the possession match.
- `components/schedule/ScheduleProvider.tsx`: `differsLive` counts down / spot / possession changes; the merge copies
  `situation` while live and clears it otherwise.
- `components/schedule/MatchupCard.tsx`: two 9–9.5px lines under the live clock (fits the 64px center + card height).

## Verification

- `lib/__tests__/gameSituation.test.ts` (3): documented ESPN field names → { down, spot, possession side, red zone };
  long-text fallback; nothing usable → null. Live-parity + live-route tests unchanged (30 passed).
- **Not verified on a live game** — none was live during this session, and the captured fixture's `situation` only has
  `isRedZone`. Kobe: glance at a live card on Sunday; if the lines never appear, ESPN's field names differ.

## Risks / open

- Possession side relies on `situation.possession` being the team id string.

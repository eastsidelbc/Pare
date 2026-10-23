# 2026-10-23 — Fantasy: trending adds free in your league (Wave B5)

Branch `feat/data-rollout` · rollout plan [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md) ("Breakout watch (waivers)")

## Why

The most useful waiver tip is "who is everyone adding that I can still get". Sleeper's trending feed is one cheap call;
the league's rosters are already fetched.

## What changed

- `lib/myteam/waiver.ts` (pure): `pickAvailable` (trending order, skip owned / unknown / non-startable positions,
  first 5), `startablePositions` (FLEX → RB/WR/TE, SUPER_FLEX adds QB, IDP slots ignored), `addsText`.
- Provider `getWaiverWatch(leagueId)` (Sleeper adapter): trending cached 15 min once for everyone; owned = all rosters'
  players + reserve + taxi. Bundle: best-effort `waiver`.
- `components/myteam/WaiverWatch.tsx` under the roster (section heading + 62px rows, §9.4 recipe). Sandbox data + e2e.

## Verification

- `lib/myteam/__tests__/waiver.test.ts` (4). e2e `myteam.spec.ts` 42 passed incl. "waiver watch" (phone + iPad).
- Live feed probed: 50 rows, ~1.8 KB (`[{ count, player_id }]`).
- **Not checked against a real league** in this session (needs a Sleeper username) — Kobe: open Fantasy, the card
  should list players nobody in your league has.

## Risks / open

- "Free" = not on any roster; a player on waivers (claim pending) still shows.

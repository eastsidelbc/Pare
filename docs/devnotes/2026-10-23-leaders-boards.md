# 2026-10-23 — Leaders: three more boards (Wave B5)

Branch `feat/data-rollout` · rollout plan [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md)

## What changed

`lib/leaders.ts` `BOARDS`: Receptions (offense), Tackles for Loss + Passes Defended (defense). Rookie versions come for free
(`getRookieBoards` maps every board). Cost: +3 board + 3 deep-scan ESPN calls per 30-min window (cached like the rest).

## Verification

- Every sort key probed live (2026): `receiving.receptions`, `defensive.tacklesForLoss`, `defensive.passesDefended` → OK.
- Playwright at 393px on /leaderboards: the three boards render, no horizontal scroll; screenshot reviewed (W. Anderson Jr.
  11.5 TFL, J. Parrish 9 PD).

## Left out on purpose

- **Passer rating / yards per carry:** ESPN's byathlete list (`isqualified=false`, and `=true` doesn't filter either) puts
  48-attempt QBs and 1-carry WRs on top. Needs a minimum-attempts rule before it's honest.
- **ESPN QBR:** not in byathlete (its QBR fields are raw sums, see the catalog); needs the Core `/qbr` endpoint + its own fetcher.

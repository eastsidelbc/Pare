# 2026-10-23 — Home "Game details" (Wave A1)

Branch `feat/data-rollout` · rollout plan [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md) (Wave A = data we already download)

## Why

`/api/live/summary` downloads ESPN's whole game summary (~578 KB) for the Home box score and used only the
skill-player lines. Team stats, quarter scores, scoring plays, the win-probability series, defenders, kickers
and the venue were thrown away. Showing them costs zero extra requests.

## What changed

- `lib/gameExtras.ts` (new, pure): `parseExtras(summary)` → `GameExtras` — 11 team-stat rows with the
  better side (fewer is better for turnovers/penalties; 3rd/4th down + red zone compared as rates; possession
  as seconds), quarters from `header…competitors[].linescores`, scoring plays, home win % sampled to
  `WIN_PROB_POINTS` (60), top `DEFENDERS_SHOWN` (2) defenders by tackles + 4×sacks + 6×INT, kickers, venue.
  Returns null when there's nothing (pregame).
- `lib/gameSummary.ts`: `GameSummary.extras?` (optional — older cached copies and pregame stay byte-identical;
  the live-parity snapshot is unchanged). `toWireSummary` passes it through.
- `components/schedule/GameDetails.tsx` (new): collapsed "Game details" button (44px, `aria-expanded`) under
  `PostGameBox`; sections render only when they have data. Tokens only, no animation, static SVG sparkline with
  an `aria-label` summary (low / high / final).
- Docs: catalog rows flipped (24), `DATA_SOURCES.md` §6 + skip list updated.

## Verification

- `lib/__tests__/gameExtras.test.ts` (9) on a new fixture `lib/__fixtures__/espn/summary-final-extras.json`
  (KC @ DAL 2025 W13, real ESPN shape trimmed to the fields read): quarters 14-0-0-14 / 7-10-3-11, better-side
  rules, 10 scoring plays ending 28–31, win prob ends at 1, venue AT&T Stadium · turf.
- Live on :4000: `/api/live/summary?event=401772694` → keys `byAbbr, headline, extras`, 4.2 KB uncompressed;
  upcoming `401873009` → no `extras`.
- `npm run check`, `npm run test:run`, token guard clean.
- **Not verified by eye** — Kobe: open a finished game on Home (phone width), tap "Game details".

## Risks / open

- Summary payload to the browser grows ~0.9 KB → ~4 KB per finished game (gzipped ~1.5 KB).
- The win-prob line is gold on the card; if it reads busy, a team-color stroke is the alternative.

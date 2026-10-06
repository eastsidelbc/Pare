# 2026-10-05 — Favorites ("Your teams") + live scores in matchup pills

Branch: `feat/favorites` (commit `0a761e0`), merged into `ui/leaders-neon-frame` → `main`. Mockups: "Pare Favorites" canvas (Round 1 look, Round 2 setup). Plan: project doc `claude/plan-odds-pills-favorites-2026-10-04.md`.

## Decisions (Kobe)
- Look **A2**: pinned "★ Your teams" group at the top of each Home week + a star in the team's color beside the favorite's abbreviation + an OUTER team-color aura on the favorite's side of the card (medium strength). No inner tint, no shimmer/looping animation.
- Setup: **all 5 entry points** (below).
- Max **3** favorites, stored on the device (no account yet).
- Not gold: a gold ring already means "open accordion card", and gold is reserved for #1 rank.

## What changed

### Favorites
- `lib/favorites/store.ts` (new) — pure logic: `toggleTeam` (refuses past the cap → `'full'`), `moveTeam`, `sanitizeTeams` (known, unique abbrs only, capped), `loadFavorites` / `saveFavorites`. localStorage key `pare:favorites`, schema `version: 1`; a corrupt/old payload loads as "nothing saved". State: `teams` (abbrs in pin order), `pin`, `glow`, `onboarded`. Tests: `lib/favorites/__tests__/store.test.ts`.
- `components/FavoritesProvider.tsx` (new) — app-wide context, mounted in `app/layout.tsx` inside `ScheduleProvider`. Same hydration pattern as `ComparisonsProvider` (default on first render → restore after mount → persist only after hydration, so defaults never overwrite saved data). Also owns the sheet / quick-menu open state and a 2.2s toast ("★ Bills added to Your teams", "Max 3 teams — remove one first").
- `components/favorites/` (new):
  - `TeamGrid` — shared 32-team grid by division.
  - `FavoritesSheet` — bottom sheet from the Home header star; link to /teams.
  - `TeamQuickMenu` — Standings row menu: Add to Your teams / Compare vs…
  - `FirstLaunch` — one-time "Who do you root for?" (AFC/NFC tiles, Continue / Skip).
  - `FavoritesOverlays` — mounts sheet + quick menu + first launch + toast once, in the layout.
  - `YourTeamsScreen` — the /teams settings screen.
- `app/teams/page.tsx` (new) — `/teams`: reorder, remove, search-add, Pin + Glow switches.
- `components/schedule/WeekSection.tsx` — when Pin is on, favorite games are MOVED (not duplicated) into a "★ Your teams" group at the top of the week, ordered by the Your-teams order. The current week shows a dashed "Pick your teams" prompt while the list is empty.
- `components/schedule/MatchupCard.tsx` — star beside a favorite's abbr; outer aura on that side when Glow is on (box-shadow outside the frame only, static).
- `components/schedule/ScheduleScreen.tsx` — header star opens the sheet.
- `components/mobile/CompactTeamSelector.tsx` — Compare picker: star on every row, "Your teams" group listed first.
- `components/standings/StandingsRow.tsx` — Division/Conf rows are buttons that open the quick menu; star marker on favorites; now `'use client'`.

### Entry points
1. First launch (Home, once).
2. Home header star → sheet → "Manage order & display" → /teams.
3. Compare team picker star.
4. Standings Division/Conf row tap → quick menu (Playoffs seed rows not tappable yet).
5. `/teams` settings.

### Bundled fixes (same commit)
- **Odds vanished on current-week finals.** The 15s live poll (raw ESPN scoreboard, no closing-odds fallback) overwrote the server's closing line with `null`. `ScheduleProvider.patchLiveMatchups` now does `odds: l.odds ?? m.odds` (a poll can update a line, never erase one), and `differsLive` ignores a poll with no line. `lib/espnScoreboard.ts` comment updated to match.
- **Compare preset pills showed only "Final".** `WeekMatchupPills` now shows scores for live + final games (`IND 24 · 17 WAS`, loser dimmed on finals like Home; clock in red while live).
- **Pills froze on Compare.** `useLiveScores` moved from `ScheduleScreen` (Home only) into `ScheduleProvider` (layout-mounted), so the one poll runs on every tab. No extra network.

## Why this way
- Context + localStorage mirrors the comparisons store — no new library, swap to account sync when sign-in lands.
- Static aura, no animation: 16 cards on screen; matches the "effects play on change, then settle" rule.
- Cap of 3 keeps the pinned group short so the rest of the week stays visible.

## Verify
- `npm run lint`, `npm run test:run`, `npm run build` on the PC.
- Home: pick 1–3 teams → their games pin to the top with star + outer aura; toggle Pin / Glow on /teams; reload keeps everything.
- First-launch screen only shows once per browser — use the Home header star to retest (or clear `pare:favorites` in DevTools → Application → Local Storage).
- Sunday with late games pending: early finals keep spread / O-U after 15s+; Compare blank tab pills show live scores updating.

## Known / next
- Standings rows are 32px tall tap targets (below 44pt) — acceptable for full-width rows, flagged.
- Not done: favorites-first sort in the Compare preset pills.
- Account sync once sign-in exists.

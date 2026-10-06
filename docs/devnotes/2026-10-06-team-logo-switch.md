# 2026-10-06 — Team logo ⇄ name switch

## What
Team logos are back on Home, Compare (team picker, rank dropdown, week pills), Standings (all 3
views) and Leaders (stat, fantasy incl. D/ST, rookie boards), behind one switch:

```ts
// config/teamIdentity.ts
export const TEAM_IDENTITY = {
  default: 'logo',                       // 'name' = logos off everywhere
  overrides: { compareHero: 'name' },    // hero keeps the nickname wordmarks
} as const satisfies TeamIdentityConfig;
```

Surfaces: `home` · `compareMenus` · `comparePills` · `compareHero` · `standings` · `leaders`.
Rule + licensing: `docs/design-system.md` §9 rule 4.

## How (`components/ui/TeamIdentity.tsx`)
- **Name mode returns its `children`.** Each call site wraps its *existing* abbreviation markup,
  so name mode is the pre-logo DOM by construction (every surface styled its abbr differently —
  one shared "name renderer" could never be pixel-identical).
- **Logo mode:** plain `<img>` of the local SVG (`public/images/nfl-logos/`), explicit
  `width`/`height` (no layout shift), `loading="lazy"`, `decoding="async"`. `next/image` adds
  nothing for SVGs. `slot` centers the logo in the old slot width so neighbouring columns stay put.
- **A11y:** `alt` = full team name; `decorative` (alt="") where a parent already announces the team
  (row/card/pill buttons with an aria-label). Not decorative: Leaders rows, Playoff wild-card sides.
- **Dark logos:** `DARK_LOGOS` (LV IND NYG JAX WAS · CHI HOU DEN DAL LAR GB BUF) get
  `filter: var(--logo-halo)` — a 1px light drop-shadow edge. Picked from the SVG fill colors, not
  a render: eyeball on a phone and edit the set. A team that still reads badly → hand-make a
  `dark/` SVG for it.
- Unknown teams (League Average, free agents with no team) fall back to the name markup.

## Sizes (all inside the old slot)
| Surface | File | Logo | Slot / fit |
|---|---|---|---|
| Home card | `schedule/MatchupCard.tsx` | 26 | 26+4+15 = 45 ≤ 46px content box of the 64px row (28 would add ~1px) |
| Team picker | `mobile/CompactTeamSelector.tsx` | 24 | slot 38 (TeamMark 15 width), 40px rows |
| Rank dropdown | `mobile/CompactRankingDropdown.tsx` | 22 | slot 35 = Average-row spacer |
| Week pills | `compare/WeekMatchupPills.tsx` | 20 | slot 30 (`ABBR_STYLE` minWidth), 44px pill |
| Compare hero (when `'logo'`) | `compare/MatchupHero.tsx` | 40 / 32 sm | under the city · record line; hero ~10px taller in logo mode |
| Standings rows | `standings/StandingsRow.tsx` (TeamRow) | 20 + abbr | `withName` (logo + TeamAbbr); TEAM column `minmax(92px,1.45fr)` in logo mode (was 64px — seed+logo+abbr+★ ≈ 90px), name mode unchanged |
| Playoff seeds / wild-card sides | `standings/PlayoffPicture.tsx` | 20 / 22 + abbr | 32px / 44px rows, `withName` |
| Leaders | `leaderboards/LeaderCard.tsx` | 18 | 30px column, `mx-auto block` |
| Team quick menu (tap a team on Standings) | `favorites/TeamQuickMenu.tsx` | 44 | left of the city + nickname title; surface `teamMenu` (added after merge) |

`TeamAbbr` (exported from StandingsRow, shared with Leaders) is untouched — call sites are wrapped.

## Verification
- `npm run check`, `npm run test:run` (115; `lib/__tests__/teamIdentity.test.ts`: resolver,
  all 32 SVGs exist, logo vs name render, slot, halo, WSH alias), `npm run build`.
- Flip test: `default: 'name'` → check + build pass; prerendered `/`, `/compare`, `/leaderboards`
  HTML has 0 logo refs and 0 `<img>` (logo mode: 64 on `/`, 146 on `/leaderboards`).
- Vitest now uses the automatic JSX runtime (`esbuild.jsx`) so tests can `renderToStaticMarkup`.
- Not verified here: the look on a phone (Kobe) — dark-logo halos, star size next to a logo.

## Decisions
- Logos while pre-monetization = **accepted trademark risk** (Kobe, 2026-10-06). `default` must be
  `'name'` before ads / Pro.
- Not on the switch (always text): favorites TeamGrid, Your teams, BlankComparePicker slots,
  Compare tab chips, quick-menu "Compare KC vs…".
- Dead `components/TeamLogo.tsx` (no importers) → `_to-delete/2026-10-06-team-logo-legacy/`.

## Follow-ups
- SVGO pass on the logos (~283 KB raw; Browns 47 KB, Bucs/Commanders 31 KB).
- `lib/fantasy.ts` / `lib/leaders.ts` still ship unused ESPN `teamLogo` URLs in RSC props.

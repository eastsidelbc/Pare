# 2026-10-06 — Team logos are back, behind a logo ⇄ name switch

## TL;DR — how to switch
```ts
// config/teamIdentity.ts
export const TEAM_IDENTITY = {
  default: 'logo',                       // 👈 'name' = logos off everywhere (one word)
  overrides: { compareHero: 'name' },    // per-surface exceptions
} as const satisfies TeamIdentityConfig;
```
Surfaces: `home` · `compareMenus` · `comparePills` · `compareHero` · `standings` · `leaders` ·
`teamMenu`. Override one: `overrides: { compareHero: 'name', leaders: 'name' }`.
Rule + licensing: `docs/design-system.md` §9 rule 4.

## Why
Logos were removed 2026-10-02/03 (Neon Frame redesign) for licensing and replaced with
team-color abbreviations / `TeamMark` wordmarks. Kobe wants them back while the app is
pre-monetization, with a one-line way to return to names before ads / Pro.

## History (same day)
| Step | What | Commit |
|---|---|---|
| 1 | Switch + `TeamIdentity` + tests; Home, Compare, Standings, Leaders wired (4 parallel agents) | `1fc0266` on `ui/team-logo-switch`, merged to `main` in `1e527eb` |
| 2 | Standings shows logo **+ abbreviation** (Kobe's ask) — `withName` prop, wider TEAM column in logo mode | in `1fc0266` |
| 3 | Team quick-menu sheet (tap a team on Standings) shows the logo by the city + nickname title — new `teamMenu` surface | `fc2ec58` on `ui/nav-styles` |

## How it works (`components/ui/TeamIdentity.tsx`)
```tsx
<TeamIdentity abbr={t.abbr} surface="standings" size={20} decorative withName>
  <TeamAbbr abbr={t.abbr} />   {/* the original markup, untouched */}
</TeamIdentity>
```
- **Name mode returns `children`.** Each call site wraps its *existing* abbreviation markup, so
  name mode is the pre-logo DOM by construction. Every surface styled its abbr differently (Home
  24px team color, pills plain white, menus TeamMark, Standings `getListTeamColor`), so one shared
  "name renderer" could never be pixel-identical.
- **Logo mode:** plain `<img>` of the local SVG (`public/images/nfl-logos/<team-name>.svg`),
  explicit `width`/`height` (no layout shift), `loading="lazy"`, `decoding="async"`.
  `next/image` adds nothing for SVGs (one `eslint-disable` with that reason).
- **Props:** `slot` = center the logo in the old slot width (columns don't move) ·
  `withName` = logo then the name markup (Standings) · `decorative` = `alt=""` when a parent
  already announces the team · `className` = applied to the img in logo mode only.
- **A11y:** `alt` = full team name unless `decorative` (row/card/pill buttons and the sheet
  dialog already carry the name in their aria-label). Leaders rows keep the alt.
- **Dark logos:** `DARK_LOGOS` (LV IND NYG JAX WAS · CHI HOU DEN DAL LAR GB BUF) get
  `filter: var(--logo-halo)` (token in `app/globals.css`) — a 1px light drop-shadow edge that
  follows the logo shape. Chosen from the SVG fill colors, not a render — eyeball on a phone and
  edit the set; a team that still reads badly → hand-make a `dark/` SVG for it.
- Unknown teams (League Average, free agents with no team) fall back to the name markup.
  ESPN legacy abbrs (WSH/JAC/LA) resolve via `resolveTeamByAbbr`.
- No hooks → works in server and client components.

## Per surface
| Surface | File | Logo | Fit |
|---|---|---|---|
| `home` | `schedule/MatchupCard.tsx` | 26 | 26+4+15 = 45 ≤ 46px content box of the 64px card (28 → +1px, 30 → +3px) |
| `compareMenus` | `mobile/CompactTeamSelector.tsx` | 24 | slot 38 (= TeamMark 15 width), 40px rows |
| `compareMenus` | `mobile/CompactRankingDropdown.tsx` | 22 | slot 35 (= Average-row spacer) |
| `comparePills` | `compare/WeekMatchupPills.tsx` | 20 | slot 30 (`ABBR_STYLE` minWidth), 44px pill |
| `compareHero` (`'name'` today) | `compare/MatchupHero.tsx` | 40 / 32 sm | under the city · record line; ~10px taller in logo mode. Also drives the Home inline compare |
| `standings` | `standings/StandingsRow.tsx` (TeamRow → Division, Conference, hunt list) | 20 + abbr | `withName`; TEAM column `minmax(92px,1.45fr)` in logo mode (was 64px: seed 18 + logo 20 + abbr ~30 + ★ ≈ 90px at 393px), name mode unchanged |
| `standings` | `standings/PlayoffPicture.tsx` | 20 / 22 + abbr | seed rows / wild-card sides, `withName` |
| `leaders` | `leaderboards/LeaderCard.tsx` | 18 | 30px column, `mx-auto block`; covers stat, fantasy (D/ST = that defense's logo) and rookie boards |
| `teamMenu` | `favorites/TeamQuickMenu.tsx` | 44 | left of the city + nickname title (`SheetTitle`); name mode = title alone, unchanged |

`TeamAbbr` (exported from StandingsRow, shared with Leaders) is untouched — call sites are wrapped.

**Always text (not on the switch):** favorites `TeamGrid`, Your teams screen, `BlankComparePicker`
slots, Compare tab chips, the "Compare KC vs…" button text.

## Verification
- `npm run check` · `npm run test:run` (117; `lib/__tests__/teamIdentity.test.ts`: resolver,
  all 32 SVGs exist, logo vs name render, `slot`, `withName`, halo, WSH alias) · `npm run build`.
- Flip test: `default: 'name'` → check + build pass; prerendered `/`, `/compare`, `/leaderboards`
  have 0 logo refs and 0 `<img>` (logo mode: 64 on `/`, 146 on `/leaderboards`).
- Vitest now uses the automatic JSX runtime (`esbuild: { jsx: 'automatic' }`) so tests can
  `renderToStaticMarkup` a component (tsconfig keeps `jsx: preserve` for Next).
- Not verified here (Kobe on device): dark-logo halos, the 13px ★ beside a 26px Home logo,
  Standings W/L/PF/PA width at 393px, Leaders / pills density.

## Decisions
- Logos while pre-monetization = **accepted trademark risk** (Kobe, 2026-10-06).
  **`default` must be `'name'` before ads / Pro.**
- Local SVGs over ESPN CDN PNGs (no hotlinking an unofficial CDN, no 500px PNG for a 20px slot,
  works offline in the WKWebView).
- Halo token over separate dark artwork (no new assets; per-team opt-in).
- Logo only (no abbr) everywhere except Standings (logo + abbr) and the hero (names).
- `withName` is a call-site prop and `teamMenu` a normal surface, so `default: 'name'` still turns
  *every* logo off — no override can keep a logo on by accident.
- Dead `components/TeamLogo.tsx` (no importers) → `_to-delete/2026-10-06-team-logo-legacy/`.

## Gotchas hit
- **Don't `npm run build` while `npm run dev` is running** — both write `.next`; the dev server
  500s on every route until `npm run dev:clean`. (Happened during the flip test.)
- **Merge editor:** `git merge --no-ff` opened Vim; the window closed before saving, leaving the
  merge staged. Finishing with `--no-edit` kept Git's `# Please enter…` help text in the message
  (`1e527eb`, same as `13481c9`). Use `git merge --no-ff <branch> -m "…"` or
  `git config --global core.editor "code --wait"`.

## Follow-ups
- SVGO pass on the logos (~283 KB raw; Browns 47 KB, Bucs / Commanders 31 KB).
- `lib/fantasy.ts` / `lib/leaders.ts` still ship unused ESPN `teamLogo` URLs in RSC props.
- Tune `DARK_LOGOS` after an on-device look.

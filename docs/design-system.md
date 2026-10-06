# Pare Design System

> Living source of truth for how Pare looks. Dark-mode only, mobile-first.
> Supersedes `styleguide.md` (which drifted — see §7). Last codified: 2026-10-01.

---

## 0. The one principle: make the right thing the easy thing

The tokens already exist in `app/globals.css`. The problem isn't the tokens — it's that
nothing *forces* components to use them, so half of them hardcode the values instead.
Every rule below exists to make using a token easier than not using one. Think of it like
a kitchen: the tokens are labeled jars on one shelf; right now people keep buying duplicate
spices because the shelf isn't at arm's reach. We're moving the shelf to arm's reach.

**`app/globals.css` `:root` is the ONLY place a color/radius/shadow value is allowed to be
written as a literal.** Everywhere else references it. If you're typing a `#hex`, an
`rgba(...)`, or a `slate-900` in a component, that's a bug.

---

## 1. Tokens (names + meaning — values live in globals.css)

**Surfaces — an elevation ladder, low → high:**
`--bg` (page) → `--surface` (a raised region) → `--card` (a thing sitting on a surface).
Rule: **a container is exactly ONE rung above its children — never the same rung.** A `--card`
inside a `--card` is the bug you spotted in the quadrant ("too many lines"): two identical
surfaces separated only by a border that carries no information. Like framing a photo, then
putting that frame inside an identical frame.

**Border:** `--border`. Used **only where elevation or a gap can't separate two things.**
Prefer a gap. Two cards side by side? Space between them, no borders facing each other.

**Accents:** `--gold` is THE primary accent (active, rankings, emphasis). `--gold-bright` is
for high-emphasis only (a filled #1 badge). Pick one per context and stick to it — today the
app mixes both as the "active tint" and they're different colors.
Team bars: Team A = `--green`, Team B = `--fire`. Never `green-500`/`#22c55e`/`orange-500`.
Status: `--red` (live/loss), `--blue` (info), `--green` (win).

**Text:** `--text` (primary) → `--subtext` (secondary) → `--muted` (tertiary/disabled).
`text-white` is NOT `--text` (#f1f5f9) — stop using `text-white` for body text.

**Radius scale:** `--radius-sm` 6 (chips) · `--radius-md` 10 (buttons/badges) ·
`--radius-lg` 14 (cards) · `--radius-xl` 20 (sheets/floating panels). **There is no 12px.**
Tailwind's `rounded-xl` is 12px — do not use it for cards; cards are `--radius-lg` (14).

**Shadows:** `--shadow-card` (resting cards) · `--shadow-pop` (floating/overlays). No ad-hoc
`shadow-2xl shadow-black/50`.

**Spacing:** stay on a 2/4/6/8/10/12 rhythm. Don't mix Tailwind half-steps (`py-1.5`) with
raw inline `marginLeft: 6` in the same component.

---

## 2. Current drift (2026-10-01 audit — representative sample of 8 components)

Ranked by how pervasive. Fix order mirrors this.

1. **Token values hardcoded as literals** (most pervasive — 6/8 files). Examples:
   - `CompactComparisonRow.tsx`: bar gradients `#16a34a→#22c55e` (= `--green`) and
     `#ff6b35→#ea580c` (= `--fire`) written as literals.
   - `BottomNav.tsx` + `DivisionTable.tsx`: `rgba(245,200,66,…)` (= `--gold-bright`) as the
     active tint; `LeaderCard.tsx`: `rgba(212,168,67,…)` (= `--gold`). **Two different golds**
     doing the same job across files.
2. **Raw Tailwind palette as surfaces/text/borders.** Worst offender: **`TeamDropdown.tsx`** —
   styled entirely in `bg-slate-900/95`, `border-slate-700/50`, `text-slate-300/500`,
   `bg-green-500/20`, `border-l-orange-400`, with **zero tokens**. (`green-500` IS `--green`;
   `orange-500` ≈ `--fire`.) Also `text-white` for stat values in `CompactComparisonRow.tsx`;
   `divide-white/5` / `bg-white/5` for dividers/tracks instead of `--border`.
3. **Off-ladder surfaces + ad-hoc shadows.** `TeamDropdown.tsx` `bg-slate-900/95` (#0f172a —
   not on the ladder) with `shadow-2xl shadow-black/50` instead of `--shadow-pop`.
4. **Radius inconsistency.** Cards disagree: `CompactPanel.tsx`, `DivisionTable.tsx`,
   `LeaderCard.tsx` use `rounded-xl` (12px); only `MatchupCard.tsx` uses `var(--radius-lg)`
   (14px). `TeamDropdown.tsx` uses `rounded-lg` (8px — off scale entirely).
5. **Accent inconsistency.** Two golds (above); team accents as palette classes in
   `TeamDropdown.tsx`; stale doc-comments in `CompactPanel`/`CompactComparisonRow` claim
   "purple accents" that don't exist in the code.
6. **Spacing micro-drift.** `LeaderCard.tsx` mixes `py-1.5`/`pl-1.5` with inline
   `marginRight: 2` / `marginLeft: 6`.

**Already clean — copy these:** `MatchupCard.tsx` (exemplary — tokens for every
color/radius/shadow), `BottomNav.tsx` (one stray gold literal), `DivisionTable.tsx` (one stray
gold literal), `CardGrid.tsx` (pure layout, no color).

**Aside:** `@react-spring/web` is a dependency but no sampled component imports it (all use
`framer-motion`). Verify repo-wide; if truly unused, drop it — one animation library.

---

## 3. The highest-leverage fix: put the tokens IN Tailwind

Right now `tailwind.config.js` only maps `background`/`foreground`. Map the whole token set,
and the correct classes become the *easy* ones (`bg-card`, `text-subtext`, `border-border`,
`rounded-lg` = 14). Drift stops being convenient.

```js
// tailwind.config.js → theme.extend
colors: {
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  card: 'var(--card)',
  border: 'var(--border)',
  gold: 'var(--gold)',
  'gold-bright': 'var(--gold-bright)',
  green: 'var(--green)',
  fire: 'var(--fire)',
  red: 'var(--red)',
  blue: 'var(--blue)',
  text: 'var(--text)',
  subtext: 'var(--subtext)',
  muted: 'var(--muted)',
},
borderRadius: {
  sm: 'var(--radius-sm)',  // 6
  md: 'var(--radius-md)',  // 10
  lg: 'var(--radius-lg)',  // 14  ← note: Tailwind's default lg is 8; this re-maps it on purpose
  xl: 'var(--radius-xl)',  // 20  ← and xl was 12; now 20
},
boxShadow: {
  card: 'var(--shadow-card)',
  pop:  'var(--shadow-pop)',
},
```

Micro-learning / the catch: re-mapping `borderRadius.lg`/`xl` changes what existing
`rounded-lg`/`rounded-xl` classes render. That's intentional (it drags everything onto the
scale) but it IS a visual shift — do it as one commit and eyeball the screens. After this,
`rounded-xl` cards become 20px; you likely want `rounded-lg` (14) for cards instead.

---

## 4. Component recipes (the canonical patterns)

- **Card** (a thing on a surface): `bg-card border border-border rounded-lg shadow-card`.
  One border max. If it holds sub-cards, the parent drops to `bg-surface` (or transparent) so
  the children are the only `--card`s.
- **Panel group in a frame** (the quadrant lesson): the frame is `bg-transparent` or
  `bg-surface` with **no border**; the panels inside are the `--card`s; separate them with a
  `gap`, not borders. Controls that "attach" to a frame need a visible frame edge — if the
  frame is transparent, a close affordance becomes a floating corner button, not a tab.
- **Pill / badge:** `rounded-md`, `--gold`/`--gold-bright` tint for active, `--muted` for rest.
- **Button:** `rounded-md`; primary = gold, ghost = `--muted` text on transparent.
- **Dropdown / popover / dialog / tabs / tooltip:** don't hand-roll (click-outside, focus,
  escape, aria). Use Radix primitives (§6) themed with tokens.

---

## 5. Migration order (when you say go — surgical, screen by screen)

1. **Wire tokens into Tailwind (§3)** — the foundation; everything else gets easier after.
2. **`TeamDropdown.tsx`** — biggest offender; rebuild on Radix + tokens (kills the most drift
   in one file).
3. **Literals → `var(--…)`**: `CompactComparisonRow` bar gradients → `--green`/`--fire`;
   the gold tints in `BottomNav`/`DivisionTable`/`LeaderCard` → one gold token.
4. **Radius pass**: cards → `rounded-lg` (14) everywhere; retire `rounded-xl` on cards.
5. **`text-white` → `text-text`**, `divide-white/5` → `divide-border`.
6. **Reconcile `styleguide.md`** (§7) or delete it in favor of this doc.

---

## 6. Tooling & libraries (recommended, stack-aware)

You already run Tailwind v3 + Radix (`react-dropdown-menu`, `react-select`) + framer-motion +
lucide. Build ON that, don't replace it.

- **`class-variance-authority` (CVA) + `tailwind-merge` + `clsx`** — the core trio for a
  Tailwind design system. CVA = a recipe card: define a `<Surface>` / `<Button>` once with
  its `variant`/`size`/`elevation` options, and every instance is guaranteed consistent and
  typed. `tailwind-merge` stops conflicting classes from fighting; `clsx` composes them.
  *This is the thing that makes "codify" real in code.* (Alt: `tailwind-variants` — same idea,
  nicer slot API; pick one.)
- **shadcn/ui** — not a dependency; a library of accessible components you **copy into the
  repo** (built on Radix + Tailwind + CVA) and own. Perfect for a vibe coder: you get a
  correct `Dialog`/`DropdownMenu`/`Tabs`/`Tooltip`/`Button`, then re-skin with your tokens.
  Use it as the component layer — especially to replace the hand-rolled `TeamDropdown` /
  `RankingDropdown`.
- **Radix primitives** — standardize ALL interactive bits on Radix (add `@radix-ui/react-dialog`,
  `-popover`, `-tabs`, `-tooltip` as needed). You get keyboard nav, focus trapping, and ARIA
  for free — the stuff hand-rolled dropdowns get wrong.
- **Enforcement (cheap, token-thrifty):** a CI grep that fails on raw palette classes / hex in
  `components/` + `app/` (e.g. ripgrep for `(bg|text|border)-(slate|gray|zinc|green|orange|purple)-` and `#[0-9a-fA-F]{6}`). Or `eslint-plugin-tailwindcss` for class hygiene. Keeps drift
  from creeping back after you clean it.

**Skip for now (overkill for a solo hobby project):** Style Dictionary (token build pipeline —
your `globals.css` + Tailwind map is enough), Storybook (heavy to maintain solo). If you want
a visual reference, add a single `/design` route in the app that renders swatches + every
component state — zero new deps, and it doubles as a QA page.

---

## 7. Fix the system's own bugs first (`styleguide.md` drift)

`styleguide.md` is the ancestor of this drift and must be reconciled or retired:
- It defines `--gold: #f5c842` — but `globals.css` says `--gold` is `#d4a843` and `#f5c842` is
  `--gold-bright`. Components copied the wrong gold. **Decide which gold is "primary" and make
  one authoritative.**
- It specs card `border-radius: 12px` — the token scale has no 12; cards should be 14
  (`--radius-lg`).

Recommendation: let **this file** be the source of truth, update `globals.css` usage to match,
and replace `styleguide.md` with a one-line pointer here (or stage it to `_to-delete/`).

---

## 8. Neon Frame — the Compare look (Round 5 "R", 2026-10-02)

The approved redesign direction. Live on **Compare only** for now; written as a template so
it can be promoted app-wide later (swap `--bg` → `--bg-deep`, `--card` → deep card gradient).
Mockups: the "Pare Compare Redesign" canvas (rounds 1–5; R = the pick, nav = Round 4 K).

**Surface ladder (tokens — change the look in `globals.css`, never in components):**
`--nav-bg` (darkest, so the nav separates) < `--bg-deep` page (#0a0d14 deep navy-slate) <
`--card-deep-*` cards (one step lighter, so they read as objects). Chosen as option "C" in the
Background ladder study (2026-10-03) over near-black #030409: easier on the eyes, no OLED
black-smear when scrolling, nav no longer melts into the page; glows lose only a little punch.
Team-color contrast is computed against this background (`COMPARE_BG` in `lib/teamColors.ts`).

**Surfaces:** page `--bg-deep`. Cards = 2px frame whose border fades
team A color → `--frame-mid` → team B color, with each team's glow (34px, 34%) spilling off its side;
inside, a `--card-deep-a → --card-deep-mid → --card-deep-b` gradient. Row dividers `--hairline`.

**Team colors (not tokens — brand data):** `lib/teamColors.ts`. Rules: (1) lift dark colors to
≥3:1 on `--bg-deep`; (2) clash → right side swaps to its alt, then left, then both;
(3) fallback to `--green` / `--fire`. Every 32×32 matchup is unit-tested to stay distinct.

**Team identity = wordmarks** (hero stays on names even when logos are on — §9 rule 4): city + record small caps, nickname in
Inter 900 outlined (`-webkit-text-stroke`) in the team's line color with a soft glow.
Component: `components/compare/MatchupHero.tsx`.

**The split-capsule bar** (`components/ui/SplitCapsuleBar.tsx`): two see-through neon tubes
meeting at the exact `useBarCalculation` ratio, a short flush white divider, leader glows
brighter. Numbers are all white (`--text`) — the trailing team is never greyed out.

**Rank tiers** (`lib/rankTier.ts`, one definition):

| Rank | Bar | Badge |
|---|---|---|
| #1 | gold ring + gold sparks + fast team-color breathe | filled gold |
| #2–5 | soft team-color breathe only (gold is #1's alone) | gold tint |
| #6–27 | plain | slate |
| #28–31 | plain | red outline (static) |
| #32 | plain | solid red "ember" glow (`effects` prop) |

**Motion budget:** widths spring via framer-motion; glows are opacity-only CSS keyframes
(`pare-*` in globals.css); blur layers only on top-5 sides; everything stops under
`prefers-reduced-motion`. Effects are opt-in on `RankBadge` so Standings stay static.
**Play on change, then settle** (perf Pass 2, 2026-10-03): every tier effect runs a short, finite
burst when it mounts — first load, team swap, PG/TOT (`SplitCapsuleBar` `effectKey`, `RankBadge`
keyed by team) — then holds a still state. The aura stays invisible while the bar slides (0.5s
delay) so its blur isn't redrawn every spring frame. Nothing on Compare loops forever.
**GPU layers (perf Pass 4, from the iPhone Web Inspector recording):** every animated effect
class carries `will-change` (aura/ember → opacity, sparks → transform + opacity) so a fading glow
redraws only itself — un-layered, Safari repainted the whole card area ~7×/s for the whole effect
window. The #32 ember pulses an `::after` layer's opacity (box-shadow never animates). The
bar meeting-point divider is static (opacity 0.9).
Comparison tab pills: every pill is washed in its two teams' colors — 22% active, 14% inactive.

**Nav (Round 4 K):** `--nav-bg` capsule (darkest surface; no backdrop blur — at 94% opacity it was
invisible, pixel diff max 2/255, but cost a re-blur per frame); the active tab is a sliding gold neon outline
(`--gold-bright` border + glow). Sizing unchanged (`--nav-pill-h`). The nav is one instance of the
shared **glass toggle** recipe (§9 rule 7) — `ActivePill` layoutId `'nav-active-pill'` (reserved for the nav).

**Density rule:** on an iPhone 14 Pro in app mode (393×759 usable) Offense **and** Defense
(5 + 5 default metrics) fit without scrolling. Re-check with any change to row/hero height.

**Menus & pickers (`components/ui/neonMenu.ts`):** team picker and rank list share one look —
deep gradient card, `--frame-mid` edge, `--hairline` rows, gold-bright small-caps header,
dimmed deep backdrop (plain dim, **no backdrop-filter blur** — a full-screen blur over animating
cards re-blurs every frame on iPhone). Rows are **40px** (`MENU_ROW_H`), fading up with a
CSS stagger (`.pare-row-in`). Height follows the screen: Floating UI
`size()` with `MENU_VIEWPORT_PADDING` (bottom keeps clear of the nav) — ~12–16 rows on a
14 Pro, ~24–26 on an iPad. Current row = 2px gold-bright edge + 8% gold tint.

**TeamMark (`components/ui/TeamMark.tsx`):** 2–3 letter abbreviation in the wordmark voice
(Inter 900, team-color outline + glow, fixed width so lists align). Replaces logo artwork in
lists/pickers. Unknown teams (League Average) → muted. Color = `getTeamPalette()` (lifted, no
clash logic — single team).

**Empty / add states:** dashed gold-bright outline + `AddMark` (gold neon "+" ring) for the
blank-comparison slots (no text — the "+" says it) and the tablet "Add comparison" cell; a filled
slot wears the team-color frame + TeamMark + nickname wordmark. "VS" = small gold italic 900.
Below the slots, `WeekMatchupPills`: this week's games as pills (`AWAY vs HOME` in plain
white 13px/700 text, two-team-color wash like the tab pills; second line = kickoff "Sun 1:00 PM",
live clock in red, or "Final"; 44px tall) — one tap fills both teams.

**Type roles (one family — Inter — styled by role):** *Display* (team wordmarks) = outlined 900,
**20px and up only** — outlines thinner than the letter counters are hard to read at small sizes.
*Controls* (nav, pills, buttons, list names) = solid 600–700, ~12–14px. *Labels* ("POINTS",
"OFFENSE", "WEEK 5") = small uppercase, tracked, subtext/gold. *Numbers* = solid 800, tabular.

**Power Surge (`components/ui/StormCrackle.tsx`, rules in `lib/powerSurge.ts`):** a team ranked
**top 5 in ≥ 3 of a card's metrics** gets a storm-crackle effect on its half of that card
(Offense and Defense judged separately; ranks = the row badges, same per-game/total data).
Chosen option "B·9": faint plasma web always on + edge arcs flaring at random (0.5–1.1 s on,
1.5–3.5 s off), Subtle intensity, team color, CSS mask fading to the middle. One canvas per
powered half, 30 fps, paused off-screen/hidden tab; reduced motion → still glow. Plays for
4 s when it mounts (card appears / team swap), fades, then leaves the still glow and stops its
frame loop (perf Pass 2).

## 9. Global rules — Neon Frame app-wide (written 2026-10-03, Compare finished)

Compare is the reference screen. Every other tab (Home, Standings, Leaders, and anything new)
follows these rules. Where a pattern isn't decided yet it says **TBD (mockup first)** — those get
designed with side-by-side mockups before code, then written here.

**1. Surfaces (one ladder, tokens only).** Nav `--nav-bg` (darkest) < page `--bg-deep` < cards
`--card-deep-*` gradient < raised/pressed states. Components never hardcode a surface color.
Migration: a tab switches its page from `--bg` → `--bg-deep` and its cards from `--card` →
the deep card recipe (§8). The old `--bg` (#0a0e1a) is already within a hair of `--bg-deep`, so
the page change is low-risk; the visible change is the cards. When every tab is migrated, the
old `--bg / --surface / --card` values get pointed at the deep tokens and retired.

**2. Type roles (one family: Inter).**
- *Display* — team wordmarks / big names: outlined 900, **20px and up only**.
- *Controls* — nav, buttons, pills, list names: solid 600–700, ~12–14px, white (gold when active).
- *Labels* — section/stat labels: ~9–11px, uppercase, tracked .14–.26em, `--subtext` (gold for a
  section header that acts as a title).
- *Numbers* — solid 800, `tabular-nums`, white. Never grey-out a "losing" stat (Compare). Exception:
  a **final game score** — the loser dims to `--muted` (§9.1), like every scoreboard.

**3. Accent.** `--gold-bright` = interactive/UI accent only (active nav, active toggle, "+", ×,
headers like "WEEK 5", current-row marker). Team colors = identity only (never for UI state).
Red = live / bad rank. Don't introduce new accent colors.

**4. Team identity — logos OR names, behind one switch** (`config/teamIdentity.ts`, 2026-10-06).
Every team mark renders through `components/ui/TeamIdentity.tsx`: `default` = `'logo'` | `'name'`
plus per-surface `overrides` (`home`, `compareMenus`, `comparePills`, `compareHero`, `standings`,
`leaders`, `teamMenu`). Logo mode = logo only (no abbreviation) — except Standings: logo + its team-color abbreviation (`withName`, wider TEAM column floor 92px only in logo mode) — local SVG in a fixed box sized to the old
slot, `alt` = full team name (empty when the row already announces it); near-black / navy logos
(`DARK_LOGOS`) get the `--logo-halo` light edge. **Name mode = the pre-logo markup, untouched**
(TeamIdentity returns its children): big context → nickname wordmark (§8 Hero, which stays on
names via `compareHero: 'name'`); small context → plain abbreviation (white text) or `TeamMark` at
sizes where its outline is readable; team color carried by a wash, frame, or the mark — not by
tinting body text. **Licensing: NFL logos are trademarks — `default` MUST be `'name'` before any
ads / Pro tier.** Logos on today = accepted risk while the app is pre-monetization (Kobe,
2026-10-06). Not on the switch (always text): favorites grid, Your teams, blank-compare slots,
Compare tab chips, the "Compare KC vs…" button text.

**5. Where team color + glow is allowed.** Single-matchup cards (Compare cards, a game card that
pairs two teams): team-color frame + side glows. **Busy lists/tables (32 teams): color on the
team mark only, rows stay neutral** — no frames or glows per row.

**6. Card types.**
- *Matchup card* (two teams): Neon Frame recipe (§8). Home game cards = **"Frame Row"** (§9.1 below).
- *List / table card* (Standings divisions, Leaders lists): deep card surface, `--hairline`
  row dividers, no team frames. Standings row = **§9.2**, Leaders row = **§9.3**.
- *Menus / dropdowns / sheets*: `components/ui/neonMenu.ts` (40px rows, screen-height).

**7. Page chrome.** Bottom nav as in §8. Page header = **"H1 · Inline"** (Home, 2026-10-03): 52px
bar on `--bg-deep` with a `--hairline` bottom edge; "Pare" (20px/900) + gold-bright "NFL" label on
the left; controls on the right in a glass capsule (`--nav-bg` + `--glass-edge`, fully round,
36px buttons) with the active value in gold-bright. Its dropdown uses `neonMenu.ts` (gold header,
40px hairline rows, current row = gold edge).
**Glass toggle (one recipe — bottom nav + every header capsule: Standings view, Fantasy TOT/PPG,
Leaders jump nav; 2026-10-06):** capsule `--nav-bg` + `--glass-edge`, fully round (headers: 36px,
items 30px drawn + `.pare-hit44` 44px tap; nav: `--nav-pill-h`). Active item = **sliding gold pill**
`components/ui/ActivePill.tsx` (1.5px `--gold-bright` border, 8% gold fill, static 0 0 12px 35% glow,
framer `layoutId` spring 420/34, `will-change: transform`, reduced motion → instant) + label
gold-bright 700. Inactive = `--glass-off` 500 (4.70:1 on `--nav-bg`; `--muted` was 4.2 — fails AA at
11–12px), no glow. Label color fades `.2s`. Styles live in `components/ui/glassControl.tsx`
(`glassColor`, `glassCapsule`, `GlassLabel` — reserves the bold width so 500↔700 never shifts
neighbours). Font size stays per control (nav 12px; headers 11.5px, jump 11px + .06em). Every
control gets its own `LayoutGroup` + unique `layoutId` (`standings-view`, `fantasy-mode`,
`leaders-jump`) so a pill never flies between controls. Not on this recipe: Home week stepper
(no on/off state), Compare tab chips (team-color wash, closable), FirstLaunch AFC/NFC.
Section headers = **"D1 · Gold rule"**: gold-bright
10px/800 uppercase label tracked .2em, then a `--hairline` rule; a "WEEK n" divider is the same in
white 13px/900.

**8. Motion & effects.** Effects carry meaning (rank tier, Power Surge) — no decoration-only
animation. Opacity/transform only, ~30 fps canvases paused off-screen, everything has a
`prefers-reduced-motion` still state. Effects are opt-in props so dense screens stay calm.
**Effects play on change, then settle** — a short finite burst, then a still state; never an
infinite loop on a resting screen (small status signals like the live-game dot are the exception).
No full-screen `backdrop-filter` blur over content that animates (use a plain dim), and no blur
behind a surface that's nearly opaque anyway. Animated elements get `will-change` for the property
they animate; never animate `box-shadow`, `filter` or size on a glow — fade an extra layer instead.

**9. Layout & touch.** Mobile-first at 393px; iPad is an enhanced layout. Touch targets ≥ 44px
tall where possible. App shell: header + nav fixed, only content scrolls.

**10. Process.** New tab = (1) mockup rounds side by side, (2) Kobe picks, (3) write the picked
recipe into this section, (4) build with tokens, (5) gate + phone/iPad screenshots. Anything that
goes against these rules or standard practice gets flagged before building (CLAUDE.md).

### 9.1 Home game card — "Frame Row" (Home Round 2 pick, 2026-10-03)

Picked on the "Pare Home Redesign" mockup board: **A · Frame Row + H1 header + D1 day labels**, with
dials **G1 subtle glow · C2 standard color · N3 solid name · 24px**. Component:
`components/schedule/MatchupCard.tsx` (`MatchupCardSkeleton.tsx` matches its footprint).

| Part | Recipe |
|---|---|
| Frame | 1.5px, `line` color team A → `--frame-mid` → team B, radius `--radius-lg`; colors from `getMatchupPalettes()` (same lift + clash swap as Compare) |
| Glow (G1) | subtle side glow only: 14px blur at 25% per team. Compare's 34px / 34% is for one card — on a 16-card list it bleeds through the gaps |
| Surface | deep card gradient `--card-deep-a → mid → b`, 64px min row, 9×12px padding |
| Team | abbreviation **solid** in the team's `line` color, Inter 900, **24px** (every team ≥ 3:1 large-text contrast on `--card-deep-a`, unit-tested). Below: nickname 10px/600 `--subtext` + record `--muted` |
| Layout | grid `team 1fr · score 36px · center 64px · score 36px · team 1fr` — fixed, symmetric score slots |
| Center | pre: kickoff time 12px/700 white · network label · odds 9px `--muted` on two lines (spread / O/U) so it never overflows 64px · live: red pulsing dot (`.pare-live-dot`) + clock 11px/700 red · final: "FINAL" label + the same two-line odds |
| Scores | 20px/800, tabular, inboard of each team. Final: winner white, loser `--muted` (no arrow — too noisy) (same size/weight, ≈ 3.7:1 — still readable). Live and ties: both white (the lead can flip) |
| Open | gold-bright 1.5px ring + soft gold glow; the inline peek below is the Compare inline pane |
| Motion | tap scale 0.985; live-dot opacity pulse only; reduced motion → static dot |

Outlined abbreviations at 24px also passed the 20px rule (all 32 fit; widest, WAS, ≈ 59px in a
≥ 85px cell), but solid was picked for scan speed — it's what most sports apps use for team text.

### 9.2 Standings — "C · Compact + seeds", R2 Standards-fixed (picked 2026-10-04)

Picked on the "Pare Standings Redesign" board: Round 1 **C** (compact rows + playoff seeds) with
**A's ESPN columns**, **L2** gold leader tint, **T2**, header **Hc**; Round 2 **V5 Dense** + V6 quiet
points; Round 3 **R2 · Standards-fixed** (same look, every text-contrast check passing).
Components: `components/standings/` — `StandingsScreen` (header + view state), `StandingsRow`
(shared row recipe), `DivisionTable`, `ConferenceTable`, `PlayoffPicture`. Logic: `lib/standingsViews.ts`.

| Part | Recipe |
|---|---|
| Header | H1 Inline (52px) + glass toggle **Division / Conf / Playoffs** (`--nav-bg` + `--glass-edge` capsule, 36px; buttons 30px drawn, **44px hit area** via `.pare-hit44`; glass toggle recipe §9 rule 7 — sliding gold pill `'standings-view'`, 11.5px, `--glass-off` 500 → gold-bright 700) |
| Card | deep gradient, 1px `--hairline` border, radius `--radius-lg`; title 10px/800 uppercase .18em, white, conference prefix `--subtext` (no gold on card titles — gold stays on the D1 labels) |
| Columns | TEAM · W · L · (T) · PCT · PF · PA · STRK (ESPN / NFL.com set). Grid `minmax(64px,1.25fr) .5fr .5fr (.42fr) minmax(38px,1.1fr) .85fr .85fr .9fr`, 4px gap, 8px side padding — PCT's 38px floor keeps "1.000" whole at the 281px iPad card |
| Column headers | 24px row, 10px/700, .06em, `--subtext` |
| Row | **32px** (dense, read-only), hairline divider. Not tappable — if rows ever open a team page they must reach 44px (or a 44px hit area on the team cell) |
| Team | seed chip + abbreviation 13px/900 in `getListTeamColor(abbr)` — the `line` color lifted toward white only as far as needed for **4.5:1** on the card and on the leader tint (unit-tested, all 32) |
| Seed chip | 18px, radius 5, 10px/800. 1–4 division winner = filled `--seed-chip`, white; 5–7 wild card = 1px `--seed-edge` outline, `--subtext`; 8–16 = blank (Division) or plain `--subtext` number (Conf / hunt). Seeds = ESPN `playoffSeed` |
| Numbers | 12px/700 white, tabular. PF / PA = `--subtext` 600 (secondary). Losing streak = `--subtext`. **Never `--muted` for small text** (3.7:1 fails AA; it's for 20px+ or decoration) |
| Leader | Division view only: row 1 gets `--leader-tint` (gold-bright 8%) |
| T column | hidden until any team in the league has a tie (`leagueHasTies`), then shown on every card — never per card |
| Views | **Division** = CardGrid 270–340, maxCols 4 (one conference per row on iPad landscape). **Conf** = 16 teams by seed + dashed "Playoff line" after 7. **Playoffs** = "If the season ended today": seeds 1–7 (BYE / DIV / WC tags), Wild Card round 7@2 · 6@3 · 5@4 (44px rows), in the hunt 8–10. Conf / Playoffs = CardGrid 300–560, maxCols 2 |
| Motion | one sliding pill on the view toggle (transform spring on change, then still; reduced motion → instant). Nothing else (the old 32-row fade-in stagger was removed). View switch scrolls content to top |

Standards scorecard (R2): header hit area 44px ✓ · smallest text 10px (headers / chips — below Apple's
11pt, accepted for dense column labels) · lowest small-text contrast 6.06:1 ✓ · worst team abbr ≥ 4.5:1 ✓ ·
no clipping at 281px with or without T ✓.

### 9.3 Leaders — R3 "edge-to-edge" + Rookies (final pick 2026-10-06)

History: "Pare Rookie Leaders" Round 3 option 1 "Standings match" (2026-10-04, built in `786cdf6`), then
the "Pare Leaders Redesign v2" canvas R3 pick (2026-10-06): 2 across on iPhone, rows pushed to the card
edges with short names, plain Fantasy header, 44px expand button, header jump capsule.
Components: `app/leaderboards/page.tsx` (header), `components/leaderboards/JumpNav.tsx`, `components/leaderboards/LeaderCard.tsx`,
`FantasyBoards.tsx`, `grid.ts`, `RefreshOnReturn.tsx`. Names: `lib/playerName.ts`. Data: `lib/leaders.ts`, `lib/fantasy.ts`.

| Part | Recipe |
|---|---|
| Header | H1 Inline (52px, `--bg-deep`, hairline bottom): "Pare" + gold-bright "LEADERS" + glass **jump capsule** FAN · OFF · DEF · ST · R (Standings capsule: `--nav-bg` + `--glass-edge`, 36px; links 30px drawn, ≥30px wide, `.pare-hit44`, 11px .06em, glass toggle recipe §9 rule 7 (`--glass-off` 500 → gold-bright 700), full `aria-label` "Jump to Rookies"). Plain anchors → `#lb-fan/off/def/st/rookies` (sections carry `scroll-margin-top: 8px`). **You-are-here:** the section at the top of the scroll area wears the sliding gold pill (`ActivePill` `'leaders-jump'`), following you as you scroll — it slides only when the section changes, never per scroll frame; a tapped link stays lit until you scroll by hand, so a short section can't flip the pill twice (`components/leaderboards/JumpNav.tsx`, rAF-throttled passive scroll; at the bottom the last section wins). R shows only when the Rookies block renders and stays lit through all rookie sections |
| Page | `--bg-deep`, **12px side gutter** (`px-3`) on header + content |
| Page order | Fantasy → Offense → Defense → Special Teams → **ROOKIES** divider → Rookie Offense → Rookie Defense → Rookie Special Teams |
| Section labels | D1 · Gold rule (`SectionLabel`). Fantasy = plain "FANTASY" label (not sticky, no position switcher — all 6 boards show) + TOT / PPG glass toggle on the right (30px drawn, 44px tap, glass toggle recipe — sliding gold pill `'fantasy-mode'`) |
| Rookies divider | white 13px/900 .14em "ROOKIES" + `--subtext` "{season} CLASS" + hairline (Home "WEEK n" voice) |
| Card | §9.2 list card: deep gradient, 1px `--hairline`, `--radius-lg`. Title 11px/800 .14em uppercase white, padding 10/6/8/7. No logos, no headshots |
| Row | **32px**, hairline top. Grid `14px · 30px · 1fr · auto`, column-gap 4px, padding **0 6px 0 3px** (numbers close to both card edges). Rank 11px/700 `--subtext`, **right-aligned** tabular (#1: gold-bright 800). Team abbr 11px/900 `getListTeamColor(normalizeTeamAbbr(abbr))`, centered in its 30px slot. Name 12px/600 white, **short form** "J. Smith-Njigba" (`shortPlayerName`: keeps "C.J.", "DK"; full name in `title`), ellipsis if still long. Value 12px/800 white tabular. #1 row `--leader-tint` |
| Expand | top 5 → all (≤25) via a real **44px footer `<button>`** "All 25 ⌄" / "Show top 5 ⌃" (12px/700 `--subtext`). iPhone: the open card spans both columns (`max-sm:col-span-full`); iPad: opens in place. No animation |
| Grid | `LEADER_GRID`: CardGrid min 170 · max 300 · maxCols 5 · gap 8 → 2 across iPhone 393, 4 iPad portrait, 5 landscape. CardGrid now enforces `maxCols` in the track minimum, uses `auto-fill` (short sections keep the same card width) and `align-items: start` (an open card doesn't stretch its row-mates) |
| Rookie data | Sleeper `years_exp === 0` matched to ESPN by id or normalized name + team (`lib/rookieMatch.ts`); each rookie board scans ESPN's top 300; empty rookie boards hide |
| Motion | two sliding pills (jump capsule, TOT/PPG) — transform spring on change, then still; reduced motion → instant. 0 running animations at rest |

Standards: touch targets — expand 44px, toggle + jump links 44px tap area ✓ · inactive toggle/jump labels `--glass-off` 4.70:1 ✓ · smallest text 10px only on the shared D1
section labels (Standings exception); rows/titles/links ≥ 11px ✓ · contrast: white 16.5:1, `--subtext` 7.1:1 (6.1 on the
leader tint), gold-bright 11.4:1, team abbr ≥ 4.5:1 ✓ · WCAG 2.5.8 24px ✓ · names truncate only past ~13 chars on iPhone.

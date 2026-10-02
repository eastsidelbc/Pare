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

**Surfaces:** page `--bg-deep` (#030409). Cards = 2px frame whose border fades
team A color → `--frame-mid` → team B color, with each team's glow (34px, 34%) spilling off its side;
inside, a `--card-deep-a → --card-deep-mid → --card-deep-b` gradient. Row dividers `--hairline`.

**Team colors (not tokens — brand data):** `lib/teamColors.ts`. Rules: (1) lift dark colors to
≥3:1 on `--bg-deep`; (2) clash → right side swaps to its alt, then left, then both;
(3) fallback to `--green` / `--fire`. Every 32×32 matchup is unit-tested to stay distinct.

**Team identity = wordmarks, not logos** (licensing): city + record small caps, nickname in
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
Comparison tab pills: every pill is washed in its two teams' colors — 22% active, 14% inactive.

**Nav (Round 4 K):** near-black glass capsule; the active tab is a sliding gold neon outline
(`--gold-bright` border + glow). Sizing unchanged (`--nav-pill-h`).

**Density rule:** on an iPhone 14 Pro in app mode (393×759 usable) Offense **and** Defense
(5 + 5 default metrics) fit without scrolling. Re-check with any change to row/hero height.

**Menus & pickers (`components/ui/neonMenu.ts`):** team picker and rank list share one look —
deep gradient card, `--frame-mid` edge, `--hairline` rows, gold-bright small-caps header,
blurred deep backdrop. Rows are **40px** (`MENU_ROW_H`). Height follows the screen: Floating UI
`size()` with `MENU_VIEWPORT_PADDING` (bottom keeps clear of the nav) — ~12–16 rows on a
14 Pro, ~24–26 on an iPad. Current row = 2px gold-bright edge + 8% gold tint.

**TeamMark (`components/ui/TeamMark.tsx`):** 2–3 letter abbreviation in the wordmark voice
(Inter 900, team-color outline + glow, fixed width so lists align). Replaces logo artwork in
lists/pickers. Unknown teams (League Average) → muted. Color = `getTeamPalette()` (lifted, no
clash logic — single team).

**Empty / add states:** dashed gold-bright outline + `AddMark` (gold neon "+" ring) for the
blank-comparison slots (no text — the "+" says it) and the tablet "Add comparison" cell; a filled
slot wears the team-color frame + TeamMark + nickname wordmark. "VS" = small gold italic 900.
Below the slots, `WeekMatchupPills`: this week's games as 36px pills (`AWAY vs HOME` TeamMarks,
two-team-color wash like the tab pills, red dot = live) — one tap fills both teams.

**Power Surge (`components/ui/StormCrackle.tsx`, rules in `lib/powerSurge.ts`):** a team ranked
**top 5 in ≥ 3 of a card's metrics** gets a storm-crackle effect on its half of that card
(Offense and Defense judged separately; ranks = the row badges, same per-game/total data).
Chosen option "B·9": faint plasma web always on + edge arcs flaring at random (0.5–1.1 s on,
1.5–3.5 s off), Subtle intensity, team color, CSS mask fading to the middle. One canvas per
powered half, 30 fps, paused off-screen/hidden tab; reduced motion → still glow.

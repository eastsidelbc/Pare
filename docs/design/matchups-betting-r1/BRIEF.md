# Pare — Matchups & Betting, Mockup Round 1 (brief)

> **For:** the designer (Claude Desktop) making the mockups. **Decider:** Kobe.
> **Date:** 2026-10-14 · **Status:** brief, nothing picked yet.
> **Output:** mockups only. No code. Kobe picks from them; the picks then become a spec.

This round has two jobs:
1. **Where** does the betting side live? Show 3 placement options so Kobe can compare them side by side.
2. **What** do the new features look like? One mockup per feature so Kobe can see what each one is worth, and decide **later** which are free and which are premium.

---

## 1. What Pare is (the identity these mockups must express)

> **Pare answers one question: how will this matchup actually go? For your fantasy lineup or your bet slip.**
> Team vs team and player vs defense, real data, and a plain-English lean.

- **Tagline (draft):** "Every matchup, tailored. Know who to start and what to bet."
- **Audience:** fantasy players and bettors, equally. Same data, two decisions.
- **Bets to cover:** the popular ones. Spread, total, moneyline, player props, team props, parlays and same-game parlays.
- **How Pare speaks:** **data leans** now ("Data leans OVER, because…" with the reasons shown). **Edge vs line** later (Pare's own number vs the book's line).
- **Four pillars:** matchup data · leans · tailored (your teams, your league, your bets, your metrics) · game day (schedule, live, box scores).

## 2. The app today (what you're designing into)

Live at pare.gg, phone-first web app wrapped in an iOS shell. **5-tab floating bottom nav** (Home · Compare · Standings · Leaders · Fantasy). Five tabs is the iPhone maximum, so a new tab means replacing one.

| Screen | What's there now |
|---|---|
| **Home** | Weekly schedule. Each game is a "Frame Row" card: two teams in team-color frames, record, kickoff/TV. **Spread + O/U shown tiny (9px, muted).** Live score + clock, final score + box score with fantasy points. Tap a card → an inline mini-compare → "Open full" → Compare. "★ Your teams" pinned on top. |
| **Compare** | Swipeable tabs of 2-team comparisons (max 8). Hero = both team nicknames in outlined wordmarks + record. Then OFFENSE and DEFENSE panels: **5 fixed metric rows each** (points, total yds, pass yds, rush yds, 3rd-down %), each a split neon bar + value + rank badge (top 5 gold, bottom 5 red). PG / TOT toggle. **No metric picker, no players, no betting info.** |
| **Fantasy (My Team)** | Links a Sleeper league. Roster rows with a **5-bar matchup meter** ("Good #27"), a next-5-weeks micro-bar, and an expand-in-place detail: hero "18.4 PPR pts/g LV allows to RBs · #27 of 32", why-stats ("Rush yds / game · 132.1 · #29"), 5 week cells, Start / Sit. **This is Pare's best matchup UI. Reuse its language.** |
| **Leaders** | Player boards (Fantasy, Offense, Defense, Special Teams, Rookies). |
| **Standings** | Division / Conference / Playoffs. |

Kobe hasn't decided what Leaders and Standings should become. Don't redesign them; an optional doorway idea is welcome (Part C).

## 3. What data is real (design around it — don't invent the impossible)

Tag every feature mockup **NOW** (works with today's data) or **LATER** (needs something new). Use realistic numbers in the same shape as below.

**Have today (NOW):**
- Team season totals: 16 offense metrics, 6 defense "allowed" metrics, each ranked 1–32 (ties "T-12").
- Per-team, per-week game log: points for/against, yards, TDs, INTs, sacks, turnovers, red-zone trips, drives. So "last 4 games" and trends are possible.
- **Fantasy points allowed per position** (QB/RB/WR/TE/K/DEF), Season or Last 4, ranked #1–32 into 5 tiers: **Avoid 1–5 · Tough 6–12 · Avg 13–20 · Good 21–27 · Great 28–32** (#32 = allows the most = best matchup).
- Per-position "why" stats for a defense (e.g. "Rush yds / game 132.1 · #29").
- Player weekly stat lines (rush yds, rec, rec yds, pass yds, TDs…), season PPR points, injury status (Q/D/O/IR).
- Game lines: **spread + total** (moneyline available, not shown yet). One line per game. No book name.
- **Hit rate against a line the user types in:** e.g. the user enters "Bijan o85.5 rush yds", and Pare shows "Over in 3 of last 4 · 6 of 8 this season" from the weekly lines. **This is possible NOW** and is a strong mockup idea.

**Don't have (LATER):**
- Player prop lines from books. That needs a paid odds API. Until then the user types the line.
- Pare's own projections. "Edge vs line" needs a projection model plus backtesting.
- Multiple books, line movement, alt lines.
- AI text. It costs money per use; mock it as a premium candidate.

## 4. Rules every mockup follows

**Look:** Pare's current design system. Don't invent a new style.
- Dark only. Page `#0a0d14` (`--bg-deep`). Cards are a gradient `#151520 → #0f121a → #121724` (`--card-deep-a/mid/b`). Nav `--nav-bg` is the darkest surface.
- Text: `#f1f5f9` primary · `#94a3b8` secondary · `#6b7280` tertiary.
- Accent: **gold-bright `#f5c842`** for interactive things (active, buttons, headers). `#d4a843` gold for emphasis. **No new accent colors.**
- Team colors are identity only (frames, glows, abbreviations), never UI state.
- Matchup tier colors (currently Fantasy-only; you may propose using them in Compare too, and say so): Avoid `#E15957` · Tough `#E07E2F` · Avg `#B0AAA3` · Good `#B4D35C` · Great `#81FDA0`. **Always paired with a word + rank, never color alone.**
- Status: `#ef4444` red = live / bad rank · `#22c55e` green = win.
- **Font: Inter.** Outlined display type only at 20px and up. Numbers 800 weight, tabular. Labels 9–11px uppercase, tracked, in secondary text.
- Section headers: gold-bright 10px/800 uppercase, tracked .2em, then a hairline rule.
- Radii **6 / 10 / 14 / 20 only** (chips / buttons / cards / sheets).
- Glass toggle for any on/off control: dark capsule, the active item gets a gold-bright ring pill.
- Matchup cards (two teams) get the Neon Frame: a 2px border fading from team A's color to team B's, with soft side glows. Busy lists stay neutral (color on the team mark only).

**Size:** iPhone **393px wide** (iPhone 14 Pro). Header 52px, floating bottom nav 78px, so the content area is about 393 × 720. Touch targets ≥ 44px. iPad is not needed this round.

**Betting copy (App Store + responsible gambling, non-negotiable):**
- Say **"Data leans OVER"**, "lean", "edge", "matchup". **Never** "lock", "guaranteed", "sure thing", "free money", "can't lose".
- Every screen that shows a bet lean carries a small footer: **"21+ · Info only, not betting advice · Gambling problem? 1-800-GAMBLER"** (10px, tertiary text).
- Don't show sportsbook brand names or logos.
- The Fantasy tab keeps **no betting language**. Bets live elsewhere.

**Premium:** where a feature might be premium, show a small **gold "PRO" tag** on it as a *candidate*. Kobe decides later; nothing is final.

---

## 5. The mockups to make

### Part A — Placement: where betting lives (3 options, same content in each)

Use **one example game in all three** so they compare fairly: **ATL @ LV, Week 7, spread LV -1.5, O/U 44.5**, and one prop: **Bijan Robinson o85.5 rush yds**.

| Option | Idea | Show |
|---|---|---|
| **A1 · Inside Compare** | Compare becomes the matchup tool. Top: a **Teams \| Players** glass toggle. Teams = today's compare plus a **Lines strip** (spread · total · ML) and a **lean card** per line. Players = player vs defense (Part B1). Home cards get a small lean teaser ("Lean: UNDER 44.5") that opens Compare. | Compare (Teams), Compare (Players), Home card with teaser |
| **A2 · New "Bets" tab** | A dedicated tab replacing one nav slot (show which one: Standings or Leaders). Lists this week's games with lines + leans; tap a game → its bets (game lines + props). Compare stays stats-only. | Bets tab list, one game's bet screen, the new nav |
| **A3 · On Home cards** | Each Home game card grows a lines row (spread · total · ML, readable size, not 9px) and a one-line lean. Tapping a lean expands the reasons inline, using the same accordion pattern Home already has. | Home list, one card expanded |

For each option, one line answering: *how many taps from opening the app to seeing the Bijan prop lean?*

### Part B — Features (one mockup each; place them where option A1 would put them, unless another spot is clearly better)

**B1 · Player vs defense — NOW.** Pick a player → see how his opponent treats his position.
- Player header (name, team, position circle like the Fantasy tab, injury badge if any).
- Matchup meter + "Great #30 · ATL allows the 3rd-most RB pts".
- Season | Last 4 toggle.
- Why-stats (rush yds allowed / game, YPC allowed, rush TDs allowed, each with a rank).
- The player's last 4 games (rush yds per game as small bars).
- The next 5 weeks' matchup cells.
- A player search/picker state.

**B2 · Data lean on a prop — NOW (the core of Pare).** The user types or picks a line: **"Bijan Robinson · Rush yds · o85.5"**. Pare shows:
- **Hit rate:** "Over in 3 of last 4 · 6 of 8 this season" (small dot row: hit/miss per game).
- The matchup tier vs this defense.
- 2–3 reasons in plain words ("LV allows 132 rush yds/game, #29").
- A clear **lean pill: "Data leans OVER"** (or "No lean": show that state too).

Also show one **game-line lean** (spread or total) built from team data: e.g. "UNDER 44.5: both offenses bottom-10 in points last 4". Include the "add a line" input and an empty state.

**B3 · Edge vs line — LATER, PRO candidate.** Same prop, now with Pare's number: "Pare projects 94 yds · line 85.5 · **+8.5 edge**". Show how confidence/uncertainty is shown honestly (a range, e.g. 78–110, not a single magic number). Add a small "How this works" link.

**B4 · Underrated bet finder — LATER, PRO candidate.** A "This week's biggest edges" list: rows of prop/line · lean · edge size · matchup tier · hit rate. Filters: bet type (props / spreads / totals), position, "my teams only". Show the honest empty state ("No strong edges yet this week").

**B5 · AI matchup summary — LATER, PRO candidate.** A short 3–4 sentence plain-English write-up of the Bijan prop or the whole game, with the numbers it's based on shown underneath (chips linking to the why-stats). Label it as AI. Show the loading state.

**B6 · Parlay / same-game check — LATER.** The user builds 2–4 legs (e.g. ATL ML + Bijan o85.5 + UNDER 44.5). Each leg gets its own lean pill + tier, and a summary line flags conflicts ("Leg 3 UNDER conflicts with leg 2's high-volume game script"). No combined "win %" claim.

**B7 · More metrics + custom metrics in Compare — NOW, PRO candidate for saved views.** Today Compare shows 5 fixed rows. Show:
- (a) a metric picker sheet (bottom sheet, grouped by category, ~16 offense / 6 defense metrics + "Last 4" versions).
- (b) Compare with 8–10 rows chosen.
- (c) a "saved view" chip row ("My betting view", "Run game").

Propose 3–5 **new metrics worth adding** that bettors and fantasy players care about and that today's data supports (e.g. points last 4, red-zone TD %, turnovers per game, sacks allowed, plays per game). List them in a note.

**B8 · Tailored home — NOW/LATER.** One concept of "your week": your teams' games first, your Sleeper starters' best and worst matchups, and your saved props with today's lean. This is the "smart picks for me" idea at small scale.

### Part C — Optional
- A doorway from **Leaders** (tap a player → his next matchup / prop lean) and/or **Standings** (playoff stakes per game). One small mockup each, only if they're quick.

---

## 6. Deliverables

- Mockups at 393px, one artboard per screen/state, **labelled** like `A1-compare-teams`, `B2-prop-lean-over`, `B2-no-lean`, etc.
- Save them to `docs/design/matchups-betting-r1/` (same format as `docs/design/my-team-p4/`, `.dc.html` + a PNG of each).
- Under each artboard, 2–4 lines:
  - what it shows
  - NOW / LATER
  - PRO candidate or free
  - anything in it that breaks the §4 rules, and why
- **Your recommendation** at the end: which placement (A1/A2/A3) and why, in 3–5 sentences, plus which B-features feel worth paying for.

## 7. Kobe's pick sheet (fill in after review)

| Question | Pick | Notes |
|---|---|---|
| Placement | A1 / A2 / A3 / mix | |
| B1 Player vs defense | keep / change / drop | |
| B2 Data lean (props + game lines) | keep / change / drop | |
| B3 Edge vs line | free / PRO / drop | |
| B4 Underrated finder | free / PRO / drop | |
| B5 AI summary | free / PRO / drop | |
| B6 Parlay check | free / PRO / drop | |
| B7 Metrics / custom metrics / saved views | free / PRO / drop | |
| B8 Tailored home | keep / change / drop | |
| New Compare metrics to add | | |
| What ships in the December App Store v1 | | |

# Leans tab — design decisions (matchups & betting, round 1)

Date: 2026-10-14 · Decider: Kobe · Source: `docs/design/matchups-betting-r1/BRIEF.md` + the three mockup boards in this folder.
This file is the **source of truth for the build**. The mockups use **sample numbers** (real shape, not live data).

## Mockups in this folder (open the .html in any browser)

| File | What it is | Status |
|---|---|---|
| `PartA-placement.html` | 3 placement options (A1 inside Compare · A2 new tab · A3 on Home cards) | **A2 picked** |
| `PartA-round2.html` | 4 ways to fit team stats on the game screen (G1–G4) + Leans list with saved props | **G2 picked** |
| `PartB-features.html` | B1–B8 feature mockups + Part C doorways + recommendation table | v1 = B1 + B2 (see scope) |
| `*.png` | one PNG per artboard, same labels as the boards | reference |

PNG names keep the old `bets` wording (e.g. `A2b-bets-list-saved.png`) — the UI itself says **Leans**.

## Decisions (fixed)

1. **Placement = A2: a new tab.** Named **Leans** (not "Bets" — users must never think they can place a bet in Pare). Icon: lucide `Scale`. Header: `Pare` + gold-bright `LEANS`.
2. **Nav:** Home · Compare · **Leans** · Leaders · Fantasy. Leans takes Standings' slot.
3. **Standings is kept, not deleted.** Route, page and components stay untouched. It opens from a new 44px icon button (lucide `ListOrdered`) in the Home header, between ★ and the week capsule. The nav list stays one array so swapping Standings back is a one-line change.
4. **Game screen = G2** (`A2b-G2-closed.png`, `A2b-G2-open.png`): team wordmarks (Compare hero) → date · time · network → a glass button **"Compare these teams ▾"** that drops today's Offense + Defense panels open in place (same Compare component, inline variant) → **Game lines** card → **Props** → footer. Tapping the team names does **not** open stats (on Compare it means "change team"; one gesture, one meaning).
5. **Leans list** (`A2b-bets-list-saved.png`): `YOUR PROPS` (saved lines, one row each: position circle, name, line, lean pill, hit rate) → day groups of game cards. Game card = Home's Frame Row card + a 3-cell lines row (Spread · Total · Moneyline, 13px) + one 44px lean row. The 9px odds leave the card center in this list only (Home's cards are unchanged).
6. **Lean rule ("3 signals", all must agree)** — recommended by design, written in as the default; thresholds live in one config file:
   - **Prop OVER:** over the line in ≥3 of last 4 games · ≥60% of games this season · matchup tier Good/Great for that position. **UNDER:** the mirror (≤1 of 4, ≤40%, Tough/Avoid).
   - **Total:** both offenses top-10 (OVER) / bottom-10 (UNDER) in points, last 4 · each team's last-4 game totals average above/below the line · over/under hit in ≥3 of 4 for both teams.
   - **Spread / moneyline:** lean only when 3 team-data signals point to the same side (plan proposes them; expected to be rare).
   - Anything else → **"No lean"**. Fewer than 4 games played → **"Not enough games yet"**.
   - The screen always shows the 3 checks (✓ / ✕) so the user sees why.
7. **Props are user-typed lines** (no odds feed yet). Stats: Rush yds · Rec yds · Receptions · Rush + rec yds · Anytime TD. Over/Under. Hit dots update live as you type. Saved on the device only ("Pare never sees your sportsbook").
8. **Copy rules (App Store + responsible gambling):** "Data leans OVER", "lean", "No lean", "edge", "matchup". Never: lock, guaranteed, sure thing, free money, can't lose, bet now. No sportsbook names or logos. **Every Leans screen** shows: `21+ · Info only, not betting advice · Gambling problem? 1-800-GAMBLER` (10px, `--subtext` — `--muted` fails AA at 10px).
9. **Fantasy tab untouched, no betting words there.**

## Visual rules (design-system.md, no new colors)

- Lean pill: `--gold` (emphasis) outline + 12% fill, 10px radius; "No lean" = slate outline + `--subtext`. `--gold-bright` stays for things you tap.
- Hit dot = `--green` (its "win" meaning); miss = hollow `--muted` ring.
- **Rule bend to write into §9 rule 3:** `--matchup-*` tier colors and `--pos-*` circles are allowed in Leans (always with word + rank / letters), not just My Team.
- Game lines card = Neon Frame (2px team-color frame, radius 20). Prop / player cards = deep list card (radius 14). Sheets = `BottomSheet`. Toggles = glass toggle. Radii 6/10/14/20 only. 44px targets.
- Reuse: `MatchupHero`, `MatchupCard`, `ComparePane inline`, `WeekControl`, My Team meter / why-stats / week cells / position circle / injury badge.

## v1 scope (this plan) vs later

| In this build | Later (own plans) |
|---|---|
| Nav swap + Standings header button | B7 metric picker + saved views (next plan) |
| Leans list + game screen (G2) | B3 Edge vs line, B4 Biggest edges (need paid odds feed + projections) — PRO candidates |
| Game-line leans (spread / total / moneyline) | B5 AI summary (per-use cost) — PRO candidate |
| B2 props: add-line sheet, saved props, prop detail, no-lean, empty | B6 parlay check |
| B1 player vs defense (+ player picker) | B8 "Your week" on Home, Part C doorways |

## Data notes (verify in P0)

- `MatchupOdds` today = `{ spread: string; overUnder: number | null }` — **no moneyline**. ESPN `odds[0]` usually carries home/away moneylines; P0 must confirm on a fixture before the ML cell ships (else show "—").
- Team last-4 points / game totals: `lib/myteam/gameLog.ts`. Matchup tiers + pts allowed by position: `lib/myteam/fpa.ts`, `rating.ts` (`TIER_CUTOFFS`), `defenseProfile.ts`. Player weekly lines: `lib/myteam/sleeper/statLines.ts` (`getWeekLines`).
- Mockup sample facts to keep straight: Week 7 → a team has ≤6 games, so season hit rates read "4 of 6", never "6 of 8".

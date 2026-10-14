# My Team — P4 → P5 handoff (2026-10-07)

Source: P4 mockup gate in claude.ai (canvas "Pare My Team Mockups" + `claude/decision-log-myteam-p4.md` in the Pare project). Include this file in the STEP 1 docs commit.

P4 mockup gate is DONE (Kobe signed off 2026-10-07). Below are the picks. Do this in order on branch feat/my-team-sleeper. Plan execution rules 1–10 apply (proof = command output, port 4000 check before any build, local commits only, never push).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — Docs commit: `docs: My Team P4 picks — design-system §9.4 + plan amendments`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A) docs/plans/my-team-fantasy.md — amend (keep everything else):
1. Context: add the product principle — "My Team ASSISTS the user's fantasy apps with information; it does not compete with them. Pare adds what the league app doesn't show (matchup quality, the why, look-ahead, start/sit by matchup). It never duplicates what the league app owns (big live team totals, lineup/roster management, opponent scoreboards)."
2. Route: /my-team → /myteam (lowercase, no dash). Sandbox: /sandbox/my-team → /sandbox/myteam. Any casing/dash variant of /myteam (e.g. /MyTeam, /my-team, /My-Team) 308-redirects to /myteam (+ same subpath). Update every verify command that uses the old paths.
3. Tab: label "Fantasy", lucide `Shirt` icon. Header reads "Pare FANTASY". Folder/component names may stay myteam.
4. Q8: live view = my players' points + roster total, but the total stays SMALL (in the STARTERS section header). No total card (principle).
5. Q9: IR/Taxi is an ALWAYS-OPEN section under Bench (not collapsed).
6. Scope add (v1): Start / Sit inside the expanded card — compares this week's matchup rank + next-5 tiers of two of my players at the same position. Labelled "Matchup only — not a projection." New pure helper lib/myteam/startSit.ts + tests.
7. PlayerSheet on phone → replaced by expand-in-place rows (several can be open). iPad keeps the list + a PINNED side panel.
8. LeagueSwitcher = bottom sheet (not the neonMenu dropdown). Onboarding = inline card on the My Team screen (not a separate screen).
9. Constants: TIER_CUTOFFS = [5, 12, 20, 27, 32] (Avoid 1–5 · Tough 6–12 · Avg 13–20 · Good 21–27 · Great 28–32; #1 = fewest FPA allowed). LOOKAHEAD strip length stays 5.
10. BottomNav (ALL pages): N3 — stacked icon over label, 5 tabs. --nav-pill-h 40 → 58, --nav-h 60 → 78.
11. P4 checkboxes: tick all, link the decision log ("claude/decision-log-myteam-p4.md in the claude.ai Pare project") and this file.
12. Replace the P5 machine gate /goal with the one in STEP 2 below, and add to P5 files: lib/myteam/startSit.ts, lib/myteam/__tests__/startSit.test.ts, middleware (or next.config redirects) for /myteam variants, app/my-team → app/myteam, app/sandbox/my-team → app/sandbox/myteam.

B) docs/design-system.md

§1 Tokens — add (values go in app/globals.css :root ONLY):
  --matchup-1: #E15957  /* Avoid */
  --matchup-2: #E07E2F  /* Tough */
  --matchup-3: #B0AAA3  /* Avg */
  --matchup-4: #B4D35C  /* Good */
  --matchup-5: #81FDA0  /* Great */
  --matchup-bye: #5b6680  /* dashed outline, empty bars */
  --matchup-track: #2a3450 /* unfilled meter bar */
  --pos-qb: #F9A8D4; --pos-qb-bg: rgba(244,114,182,0.18)
  --pos-rb: #5EEAD4; --pos-rb-bg: rgba(45,212,191,0.18)
  --pos-wr: #93C5FD; --pos-wr-bg: rgba(96,165,250,0.18)
  --pos-te: #C4B5FD; --pos-te-bg: rgba(167,139,250,0.20)
  --pos-other: #CBD5E1; --pos-other-bg: rgba(148,163,184,0.18)  /* K, DEF (not mocked — neutral, label carries it) */
  --inj-q: #FCD34D; --inj-d: #FB923C; --inj-o: #F87171; --inj-ir: #F87171  /* badge fill, text --bg-deep */
  Measured: luminance rises steadily 1→5 (0.24 / 0.31 / 0.41 / 0.57 / 0.78); vs #12151d card 4.97 / 6.21 / 7.86 / 10.71 / 14.22; vs track 3.39 / 4.24 / 5.36 / 7.31 / 9.71.

§9 rule 3 — amend: team colors stay identity-only. Three NEW scoped color families are allowed, only inside My Team: (a) --matchup-* for matchup quality (meter, week cells, start/sit); (b) --pos-* for the position circle; (c) --inj-* for the injury badge. Each is ALWAYS paired with text (tier word + rank, position letters, injury letter), never color alone. --matchup-1 (Avoid) sits near RankBadge red and --red (live): kept apart by shape (5-bar meter vs badge vs 6px live dot + clock text).

§9.4 My Team (Fantasy tab) — new section:
- Principle: assist the fantasy app, don't compete (see plan).
- Header: H1 inline "Pare FANTASY" + gold league capsule (36 drawn / 44 hit) → bottom sheet "Your leagues": 64px rows (name 15/800 + format line e.g. "Dynasty · PPR · Superflex · 10 teams", gold check on current), footer "Sleeper · {username}" + "Change username" (restarts onboarding). iPad: sheet max 560px, centred. Switching: "Loading {league}…" pill + list dims ~0.75s.
- Week bar: "WEEK n" + date range · Season | Last 4 glass toggle (unique layoutId) + ⓘ (44px) → note: "Season = every game this defense has played. Last 4 = its last 4 games played (byes skipped). Ranks and colors switch with it."
- Filter row (sticky): position pills with counts side by side ("QB 3"), 30 drawn / 44 hit, gold-bright active ring; "Expand all / Collapse all" text button (44px).
- Sections: STARTERS · BENCH · IR / TAXI (always open). Gold-rule labels 11px/800/0.18em; deep list card (--radius-lg); hairline rows.
- Row (min-height 62): position circle 38 (--pos-*; FLEX/SFLX slot shows "FLEX"/"SFLX" in the player's position color, real position moves to line 2 as "RB · "; injury letter badge on the circle's corner, --inj-*) · name 14/700 (+ IR/TAXI tag in reserve) · line 2 11px: team abbr in team color · opp · kickoff (game week: live dot + "Q3 8:12" / "Final") · micro-bar of the next 5 weeks (dashed for byes) · [game week only: 46px points column, 15px tabular, gold "+2.6" fades after a change] · signal meter 5 bars + "Great #28" 11px (bye = dashed empty bars + "Bye").
- Tap a row → expands in place (several can be open): pts/g allowed hero, why-stats with ranks, 5 week cells, then "Start / Sit ›" (48px, "vs n other RBs" hint, gold chevron) ABOVE "Open in Compare · KC vs LV" (48px). iPad: the pair is "Pin to side" + "Compare". No sheet, no long-press, no swipe.
- Start / Sit: the button area of the SAME card slides (translateX ~0.34s; none with reduced motion); metrics above stay. Shows ‹ Back + "START / SIT · RBS", player chips (44px) of my other players at that position — likely swap pre-picked (starter → first bench player at that position; bench/IR/taxi → first starter) — both players' next-5 week cells stacked under a week header, "This week, easier matchup: X", "Next 5 weeks: X (n good weeks vs m)", "Matchup only (PPR pts/g allowed to RBs) — not a projection." Easier side gets a gold border.
- iPad (QE): list left; PINNED panel right (340px portrait / 440px landscape). Pins stack in order; pinned cards start short (name, meter, next 5) and open on a tap anywhere (down-arrow hint) to show pts/g, why-stats, Open in Compare; ✕ unpins; Clear all.
- Onboarding (inline): header + week bar + a setup card where the roster goes + 4 ghost rows ("Your starters, bench and IR / Taxi show up here."). Card: "Link your fantasy league" + one line of value · "Sleeper username" input (48px, 16px text, edge --seed-edge, --radius-md) · Continue (gold-ring glass button) · lock line "Read-only — Pare can't change your lineup. Your username is saved on this device and only used to load your leagues." States in the same card: not found / bad characters (inline red line + red field edge, role=alert) · loading (shimmer skeleton, no spinner) · pick a league (64px rows, format + "In season" chip; skip when only one) · no leagues ("Check again" + "Use another username") · pre-draft ("{league} hasn't drafted yet" + Check again) · can't reach Sleeper ("Try again"). Keyboard: keep Continue visible (visualViewport handler). iPad: card max 560px.
- Game day (P6 — layout reserved now): points column beside the meter (meter never hidden), small starters total in the STARTERS header (aria-live polite), bench points shown, Pare's .pare-live-dot. No total card.
- Nav (all pages): floating capsule, 5 tabs stacked icon (18) over 11px label, items 66×48, gap 2, padding 5, sliding gold ring (ActivePill). Tabs: Home · Compare · Standings · Leaders · Fantasy (Shirt).
- Radii: 6 / 10 / 14 / 20 only. Motion: 0 animations at rest; reduced motion = no slides/flashes, live dot steady.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — Start P5 with this /goal (it replaces the plan's old P5 gate)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/goal P5 done when, in this transcript: the STEP 1 docs commit exists (git log) and docs/design-system.md contains §9.4 My Team, the amended §9 rule 3 and the §1 --matchup-*/--pos-*/--inj-* tokens, with values only in app/globals.css :root; the route lives at app/myteam (sandbox app/sandbox/myteam) and curl.exe -s -o NUL -w "%{http_code} %{redirect_url}" against localhost:4000/MyTeam, /my-team and /My-Team each returns 307 or 308 pointing at /myteam, while /myteam returns 200; BottomNav shows 5 labelled stacked tabs (Home, Compare, Standings, Leaders, Fantasy) with --nav-pill-h 58 / --nav-h 78; lib/myteam/startSit.ts exists as a pure module and npx vitest run passes its tests (likely-swap pick for starter/bench/IR, easier-matchup verdict incl. bye and ties, next-5 good-week count) plus matchupContrast (each --matchup-1..5 ≥3:1 vs the deep card and vs --matchup-track, label text ≥4.5:1, luminance strictly rising 1→5) and all existing tests; both Playwright projects (iphone-393, ipad-834) pass My Team specs: no horizontal scroll, every interactive element ≥44×44 incl. the 5-tab nav on /, /compare and /myteam, every meter/chip has a text label, inline onboarding → league → roster, league sheet switch persists after reload, Season ⇄ Last 4 changes meter text, ⓘ opens its note, IR/TAXI section visible without a tap, two rows open at once, Start / Sit slides and shows chips + "not a projection", Open in Compare lands on /compare with the right pair and reuses the tab on a second open, iPad Pin to side adds a card to the PINNED panel; the token-guard grep finds no raw palette classes in app/ or components/; git diff main shows no logic changes in lib/myteam/fpa.ts, lib/myteam/sleeper, lib/myteam/seasonSchedule.ts or app/api beyond TIER_CUTOFFS and the strip-length constant; npm run check passes; port 4000 checked (stop and tell Kobe if his dev server is running), npm run build passes; everything committed locally, nothing pushed. If the same check fails 3 times with the same error, stop and explain.

When the goal clears, print the P5 human gate: visual sign-off on iPhone + iPad (local dev) against the R9 final prototype on the canvas; the 5-tab nav feels right on every page; real league looks right; K and DEF circles (not mocked — neutral --pos-other) look OK in League B.

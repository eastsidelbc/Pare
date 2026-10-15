Build the Leans tab for Pare end to end in one run: plan it, build it phase by phase, check every phase yourself, and make every screen look like the mockups. Don't stop to ask me anything unless a STOP rule below says so.

WHERE YOU ARE
Repo: Pare (Next.js 15, TypeScript strict, Tailwind, tokens in app/globals.css). Branch: feat/leans-tab (already created by Kobe). Before anything: `git branch --show-current` must print feat/leans-tab and `git status --porcelain` must show no tracked changes — otherwise STOP and tell me.

THE SPEC (source of truth, read all of it first)
- docs/plans/2026-10-14-leans-tab/DECISIONS.md — every decision. Do not re-decide anything in it.
- docs/plans/2026-10-14-leans-tab/PartA-round2.html and PartB-features.html — THE VISUAL SPEC. Open the .html source (the <style> block + inline styles), not just the PNGs. The PNG next to each artboard has the same label.
- Screens to build and their mockups:
  | Screen | Route | Mockup PNG (artboard label) |
  |---|---|---|
  | Nav + Home header Standings button | all pages, / | A2-nav.png |
  | Leans list (empty props / saved props) | /leans | A2-bets-list.png, A2b-bets-list-saved.png |
  | Game screen, stats closed / open | /leans/[gameId] | A2b-G2-closed.png, A2b-G2-open.png |
  | Total row opened (3 signals) | /leans/[gameId] | B2-game-line-lean.png |
  | Props empty state | /leans/[gameId] | B2-empty.png |
  | Add-a-line sheet | sheet on game screen | B2-add-line.png |
  | Prop detail: lean / no lean | /leans/prop/[propId] | B2-prop-lean-over.png, B2-no-lean.png |
  | Player picker sheet | sheet on game screen | B1-player-picker.png |
  | Player vs defense | /leans/player/[playerId] | B1-player-vs-defense.png |
- Also read: CLAUDE.md, docs/design-system.md (§1, §8, §9, §9.1, §9.4), DATA_SOURCES.md, components/BottomNav.tsx, components/schedule/* (ScheduleScreen, MatchupCard, MatchupAccordion, WeekControl, WeekSection), components/compare/MatchupHero.tsx, components/compare/ComparePane.tsx, components/mobile/MobileCompareLayout.tsx, components/ui/* (BottomSheet, glassControl, ActivePill), components/myteam/* (meter, why-stats, week cells, position circle, injury badge), lib/schedule.ts, lib/espnScoreboard.ts, lib/myteam/gameLog.ts, fpa.ts, rating.ts, defenseProfile.ts, sleeper/statLines.ts, lib/fantasy.ts, app/standings/page.tsx.

LOOK-ALIKE RULE (the most important rule)
The .html is the spec, not inspiration. Match layout, section order, sizes, spacing, radii, font sizes/weights, colors and copy text. The mockup :root names map 1:1 to globals.css tokens (--card-a/mid/b = --card-deep-a/mid/b, --track = --matchup-track, the rest same name) — use tokens in code, never the hex. Reuse the existing components the mockups were drawn from (MatchupHero, MatchupCard frame, ComparePane inline, WeekControl, BottomSheet, glass toggle, My Team meter/why-stats/week cells/position circle) — import them, don't fork them. Only the NUMBERS differ (mockups use sample data). If real data or an existing component forces a visible difference, write it in the "Mockup differences" table in the plan with the reason. No silent differences.

NON-NEGOTIABLES
- Tab name "Leans", lucide Scale icon. Nav: Home · Compare · Leans · Leaders · Fantasy.
- Standings kept: nothing under app/standings or components/standings changes. It opens from a 44px lucide ListOrdered button in the Home header (between ★ and the week capsule). BottomNav keeps one ITEMS array; export a STANDINGS item next to it so swapping back is one line.
- Home's game cards, Compare, Fantasy/My Team and Leaders behave and look exactly as today (MatchupHero gets an opt-in prop for non-tappable names; its default is unchanged).
- Lean rule = DECISIONS.md §6 ("3 signals, all must agree"); every threshold in lib/leans/config.ts only; <4 games → "Not enough games yet"; else "No lean". UI always shows the 3 checks.
- Props are typed by the user, saved in localStorage (versioned key, every read/write in try/catch), never sent anywhere.
- Copy: "Data leans OVER/UNDER", "No lean". Never: lock, guarantee(d), sure thing, free money, can't lose, bet now. No sportsbook names or logos. Every /leans route shows the footer "21+ · Info only, not betting advice · Gambling problem? 1-800-GAMBLER" (10px, --subtext).
- Tokens only (no hex in components/app), radii 6/10/14/20, 44px tap targets, no new colors, no new dependencies, TypeScript strict, no `any`. Write the §9 rule 3 amendment (tier + position colors allowed in Leans with word + rank) and a §9.5 Leans recipe into docs/design-system.md.
- Local commits only. No push, no merge, no deploy.

STEP 1 — PLAN (write it, don't ask)
Write docs/plans/2026-10-14-leans-tab.md (same style as docs/plans/2026-10-12-live-scores-proxy.md): phases L0–L7 below with files + why, the screen↔mockup table, a data-availability table (from L0), the "Mockup differences" table (start empty, fill as you go), risks. Commit "docs(plans): leans tab plan". Then build.

STEP 2 — BUILD, one phase at a time. After each phase: run its checks, fix until green, update the plan's status line, commit "feat(leans): Lx <short>". Never start the next phase with a red check.

L0 Gates + data facts
- scripts/leans-gates.mjs <l0..l7|all>: PASS/FAIL table, exit 1 on any fail (reuse the port/clean-build/route-table helpers from the proxy plan's scripts). Baseline route table → docs/plans/2026-10-14-leans-tab/build-l0.txt.
- Verify on fixtures and write answers into the plan: (a) ESPN odds[0] moneyline fields for away/home; (b) gameLog has points for/against per team per week; (c) getWeekLines has rush_yd, rec, rec_yd, rush_td, rec_td per player per week; (d) fpa/rating give position tier + rank for Season and Last 4. Any "no" → that UI piece shows "—"; never invent data.
Check: script exists, baseline saved, `npm run check` + `npm run test:run` green.

L1 Nav + Standings button + /leans shell (header "Pare" + gold-bright "LEANS" + WeekControl, footer)
Check: route table has /leans and still /standings; `git diff main --stat` shows nothing under app/standings, components/standings, components/myteam, app/myteam; check + tests green.

L2 Lines data: extend MatchupOdds additively (moneyline away/home, structured spread side + number; keep the existing spread string so Home renders identically), parse in lib/espnScoreboard.ts, fixture tests.
Check: tests green; components/schedule/MatchupCard.tsx has no diff vs main.

L3 Lean engine (pure): lib/leans/config.ts, propLean.ts, gameLean.ts (total, spread, moneyline — spread/ML signals conservative, documented in the plan), shared types { verdict: 'over'|'under'|'side'|'none'|'not-enough', signals: { ok: boolean; label: string }[] }.
Check: tests — prop 3/4 + 4/6 + Great → over; 2/4 + 3/6 + Avg → none; 3 games → not-enough; under mirror; total over/under/none. Grep: no threshold literals outside config.ts.

L4 Leans list (/leans): YOUR PROPS (empty add card / saved rows), day groups of game cards (Frame Row frame + 3-cell lines row + 44px lean row), skeleton, empty week, footer.
L5 Game screen (/leans/[gameId]): MatchupHero (names not tappable), date · time · network, glass button "Compare these teams ▾" → ComparePane inline in place, Game lines card (Neon Frame) with expandable rows (3 signals + last-4 game totals), Props section, footer.
L6 Props: lib/leans/propStore.ts; add-line BottomSheet (player picker from this game's two rosters with search, stat chips rush yds / rec yds / receptions / rush+rec yds / anytime TD, Over|Under glass toggle, numeric field, live hit dots, "Save & check the data"); prop card; prop detail (/leans/prop/[propId]) with signals, Edit line, Remove, "How Pare makes a lean"; no-lean + not-enough states.
L7 Player vs defense (/leans/player/[playerId]): header, Season | Last 4 toggle, meter + "<OPP> allows the Nth-most <POS> pts", why-stats with ranks, last-4 bars (neutral --subtext fill), next-5 week cells, "Check a prop line" → L6 sheet. Docs: design-system §9 rule 3 amendment + §9.5, DATA_SOURCES.md, CHANGELOG [Unreleased], docs/devnotes/2026-10-14-leans-tab.md, CLAUDE.md nav line.
Checks L4–L7: build route table = baseline + only the new /leans routes; render tests find the footer on every /leans route, a lean pill and a "No lean"; propStore tests (save/read/remove/corrupt JSON/storage throws); lib/__tests__/leansCopy.test.ts scans app/leans, components/leans, lib/leans for banned words + sportsbook names and fails on any hit; grep finds no #hex in components/leans or app/leans; check + tests green.

STEP 3 — SELF-CHECK THE LOOK (after L4, L5, L6, L7)
Screenshots are allowed for this check only. If playwright is already in node_modules use it; otherwise run it with `npx --yes playwright@1.48.2` as a temporary tool — do NOT add it to package.json. Start the app on a free port, open each route in the screen table at 393×852, device scale 2, dark, and save PNGs to docs/plans/2026-10-14-leans-tab/after/<same label>.png (open sheets/expanded states by clicking like a user). Then look at each "after" PNG next to its mockup PNG and list every visible difference (layout, order, size, spacing, color, radius, font, copy, missing piece). Fix and re-shoot, max 3 rounds per screen. Differences caused only by real numbers are fine. Anything you can't match goes in "Mockup differences" with the reason. Commit the after/ PNGs.

STEP 4 — FINAL GATE
`node scripts/leans-gates.mjs all` exits 0; `npm run check` + `npm run test:run` green; clean production build; the after/ folder has one PNG per row of the screen table; plan status = "built, human gate pending".

STOP RULES (stop and tell me, don't guess)
- Not on feat/leans-tab or tracked changes at start.
- Code contradicts DECISIONS.md or this prompt.
- A data source in L0 is missing AND the screen would be mostly empty without it.
- A check stays red after 3 honest fix attempts.

FINAL REPORT
1) What was built per phase (files). 2) Data-availability table. 3) Mockup differences table. 4) A side-by-side list: mockup PNG → after PNG for each screen. 5) Key snippet + micro-learning + small analogy. 6) What I (Kobe) should check on my iPhone. 7) PowerShell box (push branch, merge to main — one command per line, no &&). 8) Mac deploy box (cd ~/Pare first; `pm2 logs pare --lines 30 --nostream`).

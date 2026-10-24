# Leans lab — weekly champion vs challengers (pre-registration, 2026-10-23)

Kobe: "each week, take the weeks that happened, machine-learn and test formulas, and if it looks like it works add
it the next week." Decisions: runs automatically on the Mac mini (pm2, Tuesdays 06:00); a challenger that clears
the bar is **flagged**, and goes live only with Kobe's OK. Code: `lib/leans/research/lab.ts`, `scripts/leans-lab.ts`,
`scripts/leans-lab.sh`; the search is `searchAll` (`lib/leans/research/search.ts`, the same code as research v3).

## The loop (every run)
1. Last week with **every** game final (fresh ESPN scoreboard).
2. **Grade** each finished week not graded yet, for the champion (the app's v1 3-check lean) and every challenger
   whose first week is ≤ that week. Challengers are frozen BEFORE the week they are graded on — forward only.
   Bets at −110 (2026 feed is unpriced), pushes skipped. A week is graded once.
3. **Learn** (once per new finished week): the research v3 search (73 features, singles + pairs + beam triples, 18
   market × side units, ≥ 150 bets, above break-even in 2024 and in 2025 + 2026) on 2024 + 2025 + this season so far,
   bar = 95th percentile of 200 shuffled runs. Up to **3 new challengers** per week from the survivors, best first,
   skipping exact repeats and near-copies (bets overlap > 70% with an active rule). First week = the next week.
4. **Retire** a challenger with ≥ 60 forward bets and ROI < 0; keep at most **20** active (worst retired first).
5. Write `.cache/leans-lab/<season>/ledger.json`, `scoreboard.md`, `lab.log` (outside git; nothing is committed,
   nothing changes in the app).

## Promotion bar (flag only)
A challenger is **READY** when, on its forward weeks only: ≥ **60** bets, one-sided p < **0.05** vs the −110
break-even (52.38%), and ROI above the champion's over the same weeks. READY = the scoreboard says so; Kobe decides;
then the rule is wired into the live engine as its own change (with its record on screen).

## Seed
The two research v3 finalists (`lib/leans/research/finalists.ts`), first week 7 — they were frozen before week 7.

## Known limits
- 3–5 bets per rule per week → a challenger needs ~12–20 weeks to reach 60 bets; most of this season is a warm-up.
- Week 1 of a new season: the search needs 4+ games per player, so 2027 challengers grade from week 5.
- Stat corrections that land after Tuesday aren't re-graded.

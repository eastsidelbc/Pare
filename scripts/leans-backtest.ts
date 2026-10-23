/**
 * Leans backtest — fetch a finished season, replay the engine + formula candidates, print a report.
 * Plan: docs/plans/2026-10-23-leans-backtest.md. Pure logic: lib/leans/backtest.ts.
 *
 *   npm run backtest:leans                     # season 2025 → report on stdout + REPORT_PATH
 *   npm run backtest:leans -- 2025 --refresh   # ignore the disk cache
 *
 * Every response is cached under .cache/leans-backtest/<season>/ (gitignored), so a rerun makes
 * zero network calls. ESPN: 4 at a time, back-off on 429. Run from Kobe's machines (cloud
 * sandboxes can't reach ESPN reliably).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { FORMULA_CONFIG } from '@/lib/formulas/config';
import { breakevenProb } from '@/lib/formulas/odds';
import { LEAN_CONFIG } from '@/lib/leans/config';
import {
  calibrate,
  hitPct,
  replayGameFormulas,
  replayGameLeans,
  replayPropFormula,
  replayPropLeans,
  roi,
  type TallyMap,
} from '@/lib/leans/backtest';
import { statValue } from '@/lib/leans/propLean';
import { buildFpaTable } from '@/lib/myteam/fpa';
import { loadSeason } from './leansBacktestData';

const args = process.argv.slice(2);
const SEASON = Number(args.find((a) => /^\d{4}$/.test(a)) ?? 2025);
const REFRESH = args.includes('--refresh');
const REPORT_PATH = join(process.cwd(), 'docs', 'devnotes', '2026-10-23-leans-backtest', `report-${SEASON}.md`);

const EDGES = [1, 2, 3, 4, 5];
const PROBS = [0.55, 0.6, 0.65, 0.7];

// ── report ──────────────────────────────────────────────────────────────

const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1)}%`);
const sgn = (x: number | null) => (x === null ? '—' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`);
const fix = (x: number | null, d = 2) => (x === null ? '—' : x.toFixed(d));
const BREAKEVEN = breakevenProb() ?? 0;

function table(t: TallyMap, order?: (a: string, b: string) => number): string {
  const keys = [...t.keys()].sort(order ?? ((a, b) => a.localeCompare(b, 'en', { numeric: true })));
  const rows = keys.map((k) => {
    const x = t.get(k);
    if (!x) return '';
    const r = roi(x);
    const flag = r !== null && r > 0 ? ' ✅' : '';
    return `| ${k} | ${x.bets} | ${x.wins}-${x.losses}-${x.pushes} | ${pct(hitPct(x))} | ${sgn(r)}${flag} |`;
  });
  return ['| Lean | Bets | W-L-P | Hit % | ROI |', '|---|---|---|---|---|', ...rows].join('\n');
}

const verdictLine = (m: Map<string, number>) => [...m.entries()].sort().map(([k, v]) => `${k} ${v}`).join(' · ');

async function main() {
  const t0 = Date.now();
  const { games, teamLog, propBooks, lines, props, join, players, calls } = await loadSeason(SEASON, REFRESH);
  const cappedProps = props.filter((p) => p.capped);
  const fpa = buildFpaTable(lines, { pts_ppr: 1 });

  const cal = calibrate(games);
  const engine = replayGameLeans(teamLog, games);
  const formula = replayGameFormulas(teamLog, games, EDGES);
  const propEngine = replayPropLeans(props, players, fpa);
  const propEngineCapped = replayPropLeans(cappedProps, players, fpa);
  const propFormula = replayPropFormula(props, players, PROBS);
  const withLine = games.filter((g) => g.hasSpread).length;
  const withTotal = games.filter((g) => g.total !== null).length;
  const priced = props.filter((p) => p.overPrice !== null && p.underPrice !== null).length;
  // Sanity: on unbiased pregame lines the over lands near 50% (props lean slightly under).
  const overRate = new Map<string, { over: number; n: number }>();
  for (const p of props) {
    const g = players.get(p.playerId)?.games.find((x) => x.week === p.week);
    if (!g || p.stat === 'anytime_td') continue;
    const v = statValue(g, p.stat);
    if (v === p.line) continue;
    const r = overRate.get(p.stat) ?? { over: 0, n: 0 };
    r.n += 1;
    if (v > p.line) r.over += 1;
    overRate.set(p.stat, r);
  }
  const overRows = [...overRate.entries()].map(([s, r]) => `${s} ${pct(r.over / r.n)} of ${r.n}`).join(' · ');

  const report = `# Leans backtest — ${SEASON} regular season

Generated ${new Date().toISOString().slice(0, 10)} by \`npm run backtest:leans\` (scripts/leans-backtest.ts, lib/leans/backtest.ts).
Engine unchanged (LEAN_CONFIG: lastN ${LEAN_CONFIG.lastN}, minGames ${LEAN_CONFIG.minGames}); every game graded with only earlier weeks.
**Break-even at −110 = ${pct(BREAKEVEN)}.** ✅ = ROI above 0. ROI = units per unit staked at the real price (game spreads/totals: −110; moneylines + props: the book's price).
Props are graded on the book's **opening** line (the only pregame line ESPN keeps for a finished game) and only on sides the book priced.
Small samples swing a lot: under ~100 bets, ±10 points of hit rate is noise.

## Data

- Games: ${games.length} finals · spread ${withLine} · total ${withTotal} · moneyline ${games.filter((g) => g.moneyline).length} (first pregame book with a line; in-game "Live" books skipped).
- Props: ${props.length} main lines (${priced} priced) on ${propBooks.size} games · graded ${propEngine.graded} · voided (player inactive) ${propEngine.voided}.
- Player join (ESPN athlete → Sleeper): by id ${join.byId} · by name + team ${join.byName} · unmatched ${join.unmatched} (dropped).
- Live lineup cap (top \`playersPerTeam\` by PPR before the week — what the app lists): ${cappedProps.length} of ${props.length} props.
- A week counts only if he played (Sleeper \`gp\`); an inactive week is voided, never graded as a 0.
- Player lines: ${lines.length} Sleeper weekly rows (QB/RB/WR/TE).

## Market calibration (how good the closing line was)

| Check | Value | Pare assumes |
|---|---|---|
| Actual margin vs spread — mean / SD | ${fix(cal.marginResidualMean)} / ${fix(cal.marginResidualSd)} | SD ${FORMULA_CONFIG.marginSd} |
| Actual total vs line — mean / SD | ${fix(cal.totalResidualMean)} / ${fix(cal.totalResidualSd)} | SD ${FORMULA_CONFIG.totalSd} |
| Favorites covered | ${pct(cal.favoriteCoverPct)} | — |
| Home covered | ${pct(cal.homeCoverPct)} | — |
| Overs hit | ${pct(cal.overPct)} | — |
| Prop overs hit (opening main lines) | ${overRows || '—'} | — |

## Current engine — game lines

Verdicts: ${verdictLine(engine.verdicts)}

${table(engine.tallies)}

## Current engine — props (live lineup cap — what the app would have shown)

Verdicts: ${verdictLine(propEngineCapped.verdicts)}

${table(propEngineCapped.tallies)}

## Current engine — props (every matched line)

Verdicts: ${verdictLine(propEngine.verdicts)}

${table(propEngine.tallies)}

## Formula candidates — game lines (Pare projection vs closing line)

Projected total = each offense's shrunk ppg averaged with the other defense's shrunk points allowed.
Projected margin = shrunk season point differential/game blended ${FORMULA_CONFIG.projection.seasonWeight}/${FORMULA_CONFIG.projection.last4Weight} with last 4, + ${FORMULA_CONFIG.homeField} home field. Both teams need ${LEAN_CONFIG.minGames}+ games.

${table(formula)}

## Formula candidates — props (P(over) shrunk toward the book's line)

${table(propFormula)}

---
Network calls this run: ${calls} · ${((Date.now() - t0) / 1000).toFixed(1)}s
`;
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, report);
  console.log(report);
  console.log(`→ ${REPORT_PATH}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

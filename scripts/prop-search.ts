/**
 * Prop research v3 — the big rule search (pre-registration docs/plans/2026-10-23-prop-search-v3/preregistration.md).
 *
 *   npx vite-node --config vitest.config.ts scripts/prop-search.ts --search [--null 200]
 *       2024 + 2025: every rule (singles, pairs, beam triples) on 18 market × side units, then the same
 *       search on shuffled results → the bar → finalists written into lib/leans/research/finalists.ts
 *   npx vite-node --config vitest.config.ts scripts/prop-search.ts --holdout 2026 6
 *       once: refuses on an uncommitted finalists.ts; grades the finalists on 2026 weeks 1–6 at −110
 *   npx vite-node --config vitest.config.ts scripts/prop-search.ts --paper 2026 7
 *       one finished week at a time, appended to the paper-trade log
 *
 * Data: scripts/leansBacktestData.ts (cached; zero network calls on a rerun).
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { addResult, hitPct, roi, type Tally, type TallyMap } from '@/lib/leans/backtest';
import { buildFeatureRows, TESTED_MARKETS, type FeatureRow } from '@/lib/leans/backtestV2';
import { researchFeatures } from '@/lib/leans/research/features';
import { FINALISTS } from '@/lib/leans/research/finalists';
import { overlap, ruleFires, ruleText, searchAll, type Rule, type Scored } from '@/lib/leans/research/search';
import { normCdf } from '@/lib/formulas/stats';
import { buildFpaTable } from '@/lib/myteam/fpa';
import { loadSeason, type LoadOptions } from './leansBacktestData';

const args = process.argv.slice(2);
const mode = args.includes('--search') ? 'search' : args.includes('--holdout') ? 'holdout' : args.includes('--paper') ? 'paper' : null;
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const NULL_RUNS = Number(args[args.indexOf('--null') + 1]) || 200;
const SEARCH_SEASONS = [2024, 2025] as const;
const FINALISTS_FILE = join(process.cwd(), 'lib', 'leans', 'research', 'finalists.ts');
const DIR = join(process.cwd(), 'docs', 'devnotes', '2026-10-23-prop-search-v3');
const BREAKEVEN_110 = 110 / 210;

async function rowsFor(season: number, opts: LoadOptions = {}): Promise<FeatureRow[]> {
  const d = await loadSeason(season, false, opts);
  return buildFeatureRows(
    { season, props: d.props, lines: d.lines, players: d.players, teamLog: d.teamLog, games: d.games, fpa: buildFpaTable(d.lines, { pts_ppr: 1 }) },
    { features: researchFeatures },
  );
}

const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1)}%`);
const sgn = (x: number | null) => (x === null ? '—' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`);
const quantile = (xs: readonly number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

function writeFinalists(body: string): void {
  const src = readFileSync(FINALISTS_FILE, 'utf8');
  const re = /(\/\/ <finalists>\n)[\s\S]*?(\/\/ <\/finalists>)/;
  writeFileSync(FINALISTS_FILE, src.replace(re, `$1${body}\n$2`));
}

async function search() {
  const t0 = Date.now();
  const rows = (await Promise.all(SEARCH_SEASONS.map((s) => rowsFor(s)))).flat();
  const tn = Date.now();
  const res = searchAll(rows, TESTED_MARKETS, SEARCH_SEASONS[0], NULL_RUNS, (run, nm) => {
    if (run % 10 === 0) console.log(`  shuffle ${run}/${NULL_RUNS} · ${((Date.now() - tn) / 1000).toFixed(0)}s · null best so far p95 ${quantile([...nm], 0.95).toFixed(4)}`);
  });
  const { real, unitMax, nullMax, bar, survivors, evaluated } = res;
  const features = Object.keys(rows.find((r) => r.f)?.f ?? {});
  const units = { length: res.units, conditions: res.conditions };
  console.log(`rows ${rows.length} · features ${features.length} · units ${units.length} · conditions ${units.conditions}`);
  console.log(`real search: ${evaluated.toLocaleString()} rules · best ${real[0] ? real[0].score.toFixed(4) : '—'}`);

  // Finalists: greedy, ≤ 3 per unit, ≤ 12, overlap ≤ 0.7. None survive → the 10 best, info only.
  const pool = survivors.length > 0 ? survivors : real;
  const cap = survivors.length > 0 ? 12 : 10;
  const picked: Scored[] = [];
  for (const r of pool) {
    if (picked.length >= cap) break;
    if (picked.filter((p) => p.market === r.market && p.side === r.side).length >= 3) continue;
    if (picked.some((p) => overlap(p, r, rows) > 0.7)) continue;
    picked.push(r);
  }
  const frozen = { shippable: survivors.length > 0, bar, rules: picked.map((p): Rule => ({ market: p.market, side: p.side, conds: p.conds })) };
  writeFinalists(`export const FINALISTS: Finalists = ${JSON.stringify(frozen, null, 2)};`);

  const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const unitRows = [...unitMax].map(([u, m]) => `| ${u} | ${Number.isFinite(m) ? m.toFixed(4) : '—'} |`).join('\n');
  const ruleRow = (r: Scored) =>
    `| ${ruleText(r)} | ${r.n} | ${pct(r.w / r.n)} | ${pct(r.w1 / r.n1)} / ${pct(r.w2 / r.n2)} | ${pct(r.breakeven)} | ${r.score.toFixed(4)} | ${r.score > bar ? '**yes**' : 'no'} |`;
  const report = `# Prop research v3 — search report (2024 + 2025)

Generated ${new Date().toISOString().slice(0, 10)} at commit \`${commit}\` by \`scripts/prop-search.ts --search\`.
Pre-registration: docs/plans/2026-10-23-prop-search-v3/preregistration.md.

- Search rows: ${rows.length} props (2024 + 2025) · ${features.length} features · ${units.conditions} conditions over 18 market × side units.
- **Rules evaluated (real search): ${evaluated.toLocaleString()}**; the same search ran ${NULL_RUNS} more times on shuffled results (≈ ${(evaluated * NULL_RUNS).toLocaleString()} more).
- Score = Wilson 95% lower bound of the hit rate − the unit's break-even (real prices); must clear break-even in both seasons.
- **Shuffle bar (95th percentile of the best shuffled score): ${bar.toFixed(4)}** · shuffled best: median ${quantile(nullMax, 0.5).toFixed(4)}, max ${Math.max(...nullMax).toFixed(4)}.
- **Real best: ${real[0] ? real[0].score.toFixed(4) : '—'} · rules above the bar: ${survivors.length}.**
${survivors.length === 0 ? '- **Nothing beat the shuffle bar.** The best real rules are no better than what luck finds in shuffled data. The 10 best are frozen and graded on the 2026 holdout for information only (never shippable).' : `- ${picked.length} finalists frozen (≤ 3 per unit, overlap ≤ 70%) for the one 2026 holdout grade.`}

## Best score per unit (real search)

| Unit | Best score |
|---|---|
${unitRows}

## Top 30 real rules

| Rule | Bets | Hit % | 2024 / 2025 | Break-even | Score | Above bar |
|---|---|---|---|---|---|---|
${real.slice(0, 30).map(ruleRow).join('\n')}

## Frozen for the holdout (${frozen.shippable ? 'shippable if the holdout passes' : 'information only'})

${picked.map((p, i) => `${i + 1}. ${ruleText(p)} — ${p.n} bets, ${pct(p.w / p.n)}`).join('\n')}

Run time: ${((Date.now() - t0) / 60000).toFixed(1)} min.
`;
  mkdirSync(DIR, { recursive: true });
  writeFileSync(join(DIR, 'search-report.md'), report);
  console.log(report);
}

/** Grade frozen rules on rows at −110 (one bet per prop + side; opposite calls on a prop skipped). */
function gradeFinalists(rows: readonly FeatureRow[]) {
  const perRule: TallyMap = new Map();
  const pooled: TallyMap = new Map();
  for (const r of rows) {
    if (r.actual === r.line) continue;
    const sides = new Set<string>();
    FINALISTS.rules.forEach((rule, i) => {
      if (!ruleFires(rule, r)) return;
      const o = (rule.side === 'over' ? r.actual > r.line : r.actual < r.line) ? 'win' : 'loss';
      addResult(perRule, String(i), o, -110);
      sides.add(rule.side);
    });
    if (sides.size === 1) {
      const side = [...sides][0];
      addResult(pooled, 'all', (side === 'over' ? r.actual > r.line : r.actual < r.line) ? 'win' : 'loss', -110);
    }
  }
  return { perRule, pooled: pooled.get('all') ?? ({ bets: 0, wins: 0, losses: 0, pushes: 0, units: 0 } as Tally) };
}

function pValue(t: Tally): number | null {
  const n = t.wins + t.losses;
  if (n === 0) return null;
  const z = (t.wins - n * BREAKEVEN_110) / Math.sqrt(n * BREAKEVEN_110 * (1 - BREAKEVEN_110));
  const c = normCdf(z);
  return c === null ? null : 1 - c;
}

async function holdout() {
  const [season, maxWeek] = nums;
  if (season !== 2026 || !maxWeek) throw new Error('usage: --holdout 2026 <last final week>');
  const dirty = execSync('git status --porcelain -- lib/leans/research/finalists.ts', { encoding: 'utf8' }).trim();
  if (dirty) throw new Error('finalists.ts has uncommitted changes — commit the frozen finalists first');
  if (FINALISTS.rules.length === 0) throw new Error('no finalists — run --search first');
  const out = join(DIR, 'holdout-2026.md');
  if (existsSync(out)) throw new Error(`${out} exists — the holdout is graded once`);
  const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const hash = createHash('sha256').update(JSON.stringify(FINALISTS)).digest('hex').slice(0, 12);
  const rows = await rowsFor(2026, { maxWeek, unpriced: true });
  const { perRule, pooled } = gradeFinalists(rows);
  const p = pValue(pooled);
  const r = roi(pooled);
  const passed = FINALISTS.shippable && p !== null && p < 0.05 && r !== null && r > 0;
  const report = `# Prop research v3 — 2026 holdout grade (weeks 1–${maxWeek}, once)

Generated ${new Date().toISOString().slice(0, 10)} at commit \`${commit}\`, finalists hash \`${hash}\` (${FINALISTS.shippable ? 'shippable finalists' : 'information only — nothing beat the shuffle bar'}).
Rows: ${rows.length} props (lineup cap, played, 4+ games before). Unpriced feed → every bet at −110 (break-even 52.38%).

## Primary test (pre-registered): all finalists pooled
${pooled.wins}-${pooled.losses} · hit ${pct(hitPct(pooled))} · ROI ${sgn(r)} · one-sided p ${p === null ? '—' : p.toFixed(3)} → **${passed ? 'PASS' : 'FAIL'}**

## Per rule
| # | Rule | W-L | Hit % | ROI |
|---|---|---|---|---|
${FINALISTS.rules.map((rule, i) => { const t = perRule.get(String(i)); return `| ${i + 1} | ${ruleText(rule)} | ${t ? `${t.wins}-${t.losses}` : '0-0'} | ${pct(t ? hitPct(t) : null)} | ${sgn(t ? roi(t) : null)} |`; }).join('\n')}
`;
  mkdirSync(DIR, { recursive: true });
  writeFileSync(out, report);
  console.log(report);
}

async function paper() {
  const [season, week] = nums;
  if (season !== 2026 || !week) throw new Error('usage: --paper 2026 <finished week>');
  const rows = (await rowsFor(2026, { maxWeek: week, unpriced: true })).filter((r) => r.week === week);
  const { perRule, pooled } = gradeFinalists(rows);
  const line = `| W${week} | ${pooled.wins}-${pooled.losses} | ${pct(hitPct(pooled))} | ${sgn(roi(pooled))} | ${FINALISTS.rules.map((_, i) => { const t = perRule.get(String(i)); return t ? `${t.wins}-${t.losses}` : '0-0'; }).join(' · ')} |\n`;
  const file = join(DIR, 'paper-trade-2026.md');
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `# Prop research v3 — paper trading, 2026 (frozen finalists, −110)\n\n| Week | Pooled W-L | Hit % | ROI | Per rule (1…${FINALISTS.rules.length}) |\n|---|---|---|---|---|\n`);
  }
  appendFileSync(file, line);
  console.log(line);
}

if (!mode) {
  console.error('usage: scripts/prop-search.ts --search [--null N] | --holdout 2026 <week> | --paper 2026 <week>');
  process.exit(1);
}
(mode === 'search' ? search() : mode === 'holdout' ? holdout() : paper()).catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

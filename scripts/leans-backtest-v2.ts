/**
 * Prop engine v2 — tune on 2024, grade once on 2025 (pre-registration:
 * docs/plans/2026-10-23-prop-engine-v2/preregistration.md; pure logic lib/leans/backtestV2.ts).
 *
 *   npx vite-node --config vitest.config.ts scripts/leans-backtest-v2.ts --tune 2024   # loads 2024 ONLY → writes PROP_V2_FROZEN into lib/leans/config.ts
 *   (commit the frozen config + pre-registration)
 *   npx vite-node --config vitest.config.ts scripts/leans-backtest-v2.ts --grade 2025  # refuses on an uncommitted config.ts; grades + walk-forward,
 *                                            # writes the report + PROP_V2_SHIP (the pre-registered gate)
 *
 * Data: the cached seasons (scripts/leansBacktestData.ts), zero network calls on a rerun.
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  buildFeatureRows,
  gate,
  gradeAll,
  luckPassRate,
  METHODS,
  pickWinner,
  SIDES,
  TESTED_MARKETS,
  tuneAll,
  unitKey,
  walkForward,
  type FeatureRow,
  type FrozenParams,
  type GateResult,
} from '@/lib/leans/backtestV2';
import { hitPct, roi, type Tally } from '@/lib/leans/backtest';
import type { ShipTable } from '@/lib/leans/combine';
import { PROP_V2_FROZEN } from '@/lib/leans/config';
import { buildFpaTable } from '@/lib/myteam/fpa';
import { loadSeason } from './leansBacktestData';

const args = process.argv.slice(2);
const mode = args.includes('--tune') ? 'tune' : args.includes('--grade') ? 'grade' : null;
const season = Number(args.find((a) => /^\d{4}$/.test(a)));
const TRAIN = 2024;
const TEST = 2025;
const CONFIG = join(process.cwd(), 'lib', 'leans', 'config.ts');
const REPORT = join(process.cwd(), 'docs', 'devnotes', '2026-10-23-prop-engine-v2', `report-${TEST}.md`);

async function rowsFor(year: number): Promise<FeatureRow[]> {
  const d = await loadSeason(year);
  return buildFeatureRows({ season: year, props: d.props, lines: d.lines, players: d.players, teamLog: d.teamLog, games: d.games, fpa: buildFpaTable(d.lines, { pts_ppr: 1 }) });
}

/** Replace the text between `// <tag>` and `// </tag>` in config.ts. */
function writeBlock(tag: string, body: string): void {
  const src = readFileSync(CONFIG, 'utf8');
  const re = new RegExp(`(// <${tag}>\\n)[\\s\\S]*?(// </${tag}>)`);
  if (!re.test(src)) throw new Error(`no ${tag} block in config.ts`);
  writeFileSync(CONFIG, src.replace(re, `$1${body}\n$2`));
}

const round = (x: unknown): unknown =>
  typeof x === 'number' ? Number(x.toPrecision(6)) : Array.isArray(x) ? x.map(round) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, round(v)])) : x;

const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1)}%`);
const sgn = (x: number | null) => (x === null ? '—' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`);
const wl = (t: Tally | null | undefined) => (t ? `${t.wins}-${t.losses}-${t.pushes}` : '—');

async function tune() {
  if (season !== TRAIN) throw new Error(`--tune runs on ${TRAIN} only`);
  const rows = await rowsFor(TRAIN);
  const params = round(tuneAll(rows)) as FrozenParams;
  writeBlock('prop-v2-frozen', `export const PROP_V2_FROZEN: FrozenParams = ${JSON.stringify(params, null, 2)};`);
  const units = TESTED_MARKETS.flatMap((m) => SIDES.map((s) => unitKey(m, s)));
  console.log(`2024 feature rows: ${rows.length}`);
  for (const u of units) console.log(`${u.padEnd(22)} kofn ${params.kofn[u] ? `k ${params.kofn[u]?.k} veto ${params.kofn[u]?.veto} θ ${Object.keys(params.kofn[u]?.theta ?? {}).length}` : '—'} · logit ${params.logit[u]?.cut ?? '—'}`);
  for (const [stat, m] of Object.entries(params.models)) console.log(`model ${stat}: λ ${m?.l2}, positions ${m?.positions.join('/')}`);
  console.log(`→ PROP_V2_FROZEN written to lib/leans/config.ts. Commit it (and the pre-registration) before --grade.`);
}

function gateRow(g: GateResult): string {
  return `| ${g.unit} | ${g.method} | ${g.tally.bets} | ${wl(g.tally)} | ${pct(g.hit)} | ${pct(g.breakeven)} | ${sgn(g.roi)} | ${wl(g.walk)} ${sgn(g.walkRoi)} | ${g.p === null ? '—' : g.p.toFixed(3)} | ${g.beatsBlanket ? 'yes' : 'no'} | **${g.verdict}** |`;
}

async function grade() {
  if (season !== TEST) throw new Error(`--grade runs on ${TEST} only`);
  const dirty = execSync('git status --porcelain -- lib/leans/config.ts', { encoding: 'utf8' }).trim();
  if (dirty) throw new Error('lib/leans/config.ts has uncommitted changes — commit the frozen params first');
  const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const hash = createHash('sha256').update(JSON.stringify(PROP_V2_FROZEN)).digest('hex').slice(0, 12);
  if (Object.keys(PROP_V2_FROZEN.kofn).length === 0 && Object.keys(PROP_V2_FROZEN.logit).length === 0) throw new Error('PROP_V2_FROZEN is empty — run --tune 2024 first');

  const [train, test] = await Promise.all([rowsFor(TRAIN), rowsFor(TEST)]);
  const graded = gradeAll(PROP_V2_FROZEN, test);
  const walk = walkForward(train, test);
  const results = gate(PROP_V2_FROZEN, test, graded, walk);

  const ship: ShipTable = {};
  const units = TESTED_MARKETS.flatMap((m) => SIDES.map((s) => unitKey(m, s)));
  for (const u of units) {
    const { result } = pickWinner(results, PROP_V2_FROZEN, u);
    if (result && (result.method === 'kofn' || result.method === 'logit')) {
      ship[u] = { method: result.method, season: TEST, wins: result.tally.wins, losses: result.tally.losses, roi: Number((result.roi ?? 0).toFixed(4)), beatsBlanket: result.beatsBlanket };
    }
  }

  // Passes expected from luck alone: a no-edge rule (true return = −vig) still shows ROI > 0.
  // A coin-flip bettor at −110 wins 0.5 × 100/110 and loses 0.5 per bet → ROI −4.5%.
  const vig = 0.5 - 0.5 * (100 / 110);
  const luck = results.reduce((s, g) => s + (g.tally.bets >= 50 ? luckPassRate(g.tally.bets, vig) ?? 0 : 0), 0);
  const passed = results.filter((g) => g.verdict === 'pass');

  const methodTable = units
    .map((u) => {
      const cells = METHODS.map((m) => {
        const t = graded.get(`${u}|${m}`);
        return t ? `${t.bets} · ${pct(hitPct(t))} · ${sgn(roi(t))}` : '—';
      });
      return `| ${u} | ${cells.join(' | ')} |`;
    })
    .join('\n');

  const report = `# Prop engine v2 — held-out grade, ${TEST}

Generated ${new Date().toISOString().slice(0, 10)} by \`npx vite-node --config vitest.config.ts scripts/leans-backtest-v2.ts --grade ${TEST}\` at commit \`${commit}\`,
frozen params hash \`${hash}\` (PROP_V2_FROZEN in lib/leans/config.ts, tuned on ${TRAIN} only).
Pre-registration: docs/plans/2026-10-23-prop-engine-v2/preregistration.md.

Rows: ${TRAIN} ${train.length} props · ${TEST} ${test.length} props (live lineup cap, played, 4+ games before, tested markets).
Props graded on the book's **opening** line at the book's price; a side the book didn't price isn't bet.

## Ship gate (per market + side, per method)

Pass = ≥ 50 decided bets · hit % above the average break-even of those bets · ROI > 0 · walk-forward ROI ≥ 0
(fails only the walk-forward → watch). p = one-sided chance of this many wins if the true hit rate were the break-even.
"Beat blanket" = ROI above "always take this side" on the same ${TEST} props (Kobe's label, not a gate).

| Unit | Method | Bets | W-L-P | Hit % | Break-even | ROI | Walk-forward | p | Beat blanket | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
${results.map(gateRow).join('\n')}

**Passed: ${passed.length}** of ${results.length} tests. Passes expected from luck alone (no-edge rules, ROI > 0 by chance, ≥ 50 bets): **≈ ${luck.toFixed(1)}**.
${passed.length <= luck ? 'That is no more than chance would produce — treat every pass as unproven.' : 'More than chance alone would produce, but read each p-value: p > 0.1 is weak evidence.'}

## Shipped (PROP_V2_SHIP)

${Object.keys(ship).length === 0 ? 'Nothing passed — every market stays "data rows only, no lean".' : Object.entries(ship).map(([u, s]) => `- ${u}: ${s?.method} · ${s?.wins}-${s?.losses} · ${sgn(s?.roi ?? null)} · beat blanket: ${s?.beatsBlanket ? 'yes' : 'no'}`).join('\n')}

## All methods on the same ${TEST} props (bets · hit % · ROI)

| Unit | v1 (3 signals) | Checklist | Logistic | Always this side |
|---|---|---|---|---|
${methodTable}
`;
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, report);
  writeBlock('prop-v2-ship', `export const PROP_V2_SHIP: ShipTable = ${JSON.stringify(ship, null, 2)};`);
  console.log(report);
  console.log(`→ ${REPORT}\n→ PROP_V2_SHIP written to lib/leans/config.ts`);
}

if (!mode || !Number.isFinite(season)) {
  console.error('usage: npx vite-node --config vitest.config.ts scripts/leans-backtest-v2.ts --tune 2024 | --grade 2025');
  process.exit(1);
}
(mode === 'tune' ? tune() : grade()).catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

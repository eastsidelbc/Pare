/**
 * Leans lab — the weekly champion-vs-challengers job (pre-registration
 * docs/plans/2026-10-23-leans-lab/preregistration.md; pure logic lib/leans/research/lab.ts).
 *
 *   npx vite-node --config vitest.config.ts scripts/leans-lab.ts --weekly [--season 2026] [--null 200]
 *
 * 1. Finds the last week whose games are ALL final (ESPN scoreboard, fresh).
 * 2. Grades every not-yet-graded finished week for the champion (v1) + every challenger frozen before it.
 * 3. Learns: the full rule search (+ shuffle bar) on 2024 + 2025 + this season through that week, and
 *    freezes up to 3 new challengers for the next week.
 * 4. Writes .cache/leans-lab/<season>/ledger.json + scoreboard.md (+ a log line). Nothing in git changes;
 *    nothing goes live — a "READY" challenger waits for Kobe's OK.
 *
 * Scheduled on the Mac mini with pm2 (scripts/leans-lab.sh, Tuesdays 06:00). Safe to re-run: a week is
 * graded once, and a week is learned from once.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildFeatureRows, TESTED_MARKETS, type FeatureRow } from '@/lib/leans/backtestV2';
import { researchFeatures } from '@/lib/leans/research/features';
import { FINALISTS } from '@/lib/leans/research/finalists';
import { addChallengers, gradeWeek, newLedger, scoreboard, type Ledger } from '@/lib/leans/research/lab';
import { searchAll } from '@/lib/leans/research/search';
import { buildFpaTable } from '@/lib/myteam/fpa';
import { loadSeason, WEEKS, type LoadOptions } from './leansBacktestData';

const args = process.argv.slice(2);
const argOf = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const SEASON = Number(argOf('--season') ?? 2026);
const NULL_RUNS = Number(argOf('--null') ?? 200);
/** The research v3 finalists were frozen before this week's games (2026-10-23). */
const SEED_WEEK = 7;
const SEARCH_BASE = [2024, 2025] as const;
const DIR = join(process.cwd(), '.cache', 'leans-lab', String(SEASON));
const LEDGER = join(DIR, 'ledger.json');
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

const log = (msg: string) => {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(line);
  mkdirSync(DIR, { recursive: true });
  appendFileSync(join(DIR, 'lab.log'), `${line}\n`);
};

/** Last week in which every game is final (fresh fetch — never the disk cache). */
async function lastFinalWeek(): Promise<number> {
  let last = 0;
  for (let w = 1; w <= WEEKS; w++) {
    const res = await fetch(`${SITE}/scoreboard?seasontype=2&week=${w}&dates=${SEASON}`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`ESPN scoreboard ${res.status}`);
    const events = ((await res.json()) as { events?: Array<{ status?: { type?: { completed?: boolean } } }> }).events ?? [];
    if (events.length === 0 || !events.every((e) => e.status?.type?.completed)) break;
    last = w;
  }
  return last;
}

async function rowsFor(season: number, opts: LoadOptions = {}): Promise<FeatureRow[]> {
  const d = await loadSeason(season, false, opts);
  return buildFeatureRows(
    { season, props: d.props, lines: d.lines, players: d.players, teamLog: d.teamLog, games: d.games, fpa: buildFpaTable(d.lines, { pts_ppr: 1 }) },
    { features: researchFeatures },
  );
}

function loadLedger(): Ledger {
  if (existsSync(LEDGER)) return JSON.parse(readFileSync(LEDGER, 'utf8')) as Ledger;
  return newLedger(SEASON, SEED_WEEK, FINALISTS.rules.map((rule) => ({ rule, source: 'research v3 finalist (frozen 2026-10-23)' })));
}

async function weekly() {
  const t0 = Date.now();
  const last = await lastFinalWeek();
  let ledger = loadLedger();
  log(`season ${SEASON}: last all-final week ${last}; graded through ${ledger.gradedThrough}, learned through ${ledger.learnedThrough}`);

  const season = last > 0 ? await rowsFor(SEASON, { maxWeek: last, unpriced: SEASON >= 2026 }) : [];
  for (let w = ledger.gradedThrough + 1; w <= last; w++) {
    ledger = gradeWeek(ledger, season, w);
    log(`graded week ${w}`);
  }

  if (last > ledger.learnedThrough && last >= SEED_WEEK - 1) {
    const base = (await Promise.all(SEARCH_BASE.map((s) => rowsFor(s)))).flat();
    const all = [...base, ...season];
    const res = searchAll(all, TESTED_MARKETS, SEARCH_BASE[0], NULL_RUNS, (run) => {
      if (run % 50 === 0) log(`  shuffle ${run}/${NULL_RUNS}`);
    });
    ledger = addChallengers(ledger, res.survivors, last + 1, `search after W${last}`, all);
    ledger = { ...ledger, learnedThrough: last };
    log(`learned through week ${last}: ${res.evaluated.toLocaleString()} rules, bar ${res.bar.toFixed(4)}, best ${res.real[0]?.score.toFixed(4) ?? '—'}, survivors ${res.survivors.length}`);
  }

  mkdirSync(DIR, { recursive: true });
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
  writeFileSync(join(DIR, 'scoreboard.md'), scoreboard(ledger, new Date().toISOString()));
  log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min → ${join(DIR, 'scoreboard.md')}`);
}

if (!args.includes('--weekly')) {
  console.error('usage: scripts/leans-lab.ts --weekly [--season 2026] [--null 200]');
  process.exit(1);
}
weekly().catch((e: unknown) => {
  log(`FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Phase gates for docs/plans/2026-10-14-leans-tab.md.
 *
 *   node scripts/leans-gates.mjs <l0|l1|l2|l3|l4|l5|l6|l7|all>
 *   node scripts/leans-gates.mjs build <name>   # port check + clean + build → <ART>/build-<name>.txt
 *
 * Prints a PASS/FAIL table; exits 1 on any failure. Every build first checks
 * port 4000 is free (a running `npm run dev` would have its .next clobbered),
 * then runs `npm run clean` + `npm run build`. Helpers follow
 * scripts/live-proxy-gates.mjs; the route table parser is scripts/route-table-diff.mjs.
 *
 * Route rule (L1, L4–L7, all): every route in build-l0.txt keeps its symbol +
 * Revalidate/Expire tokens, and every NEW route is /leans… or /api/leans….
 * `all` = every static check + check/test once + one build + the route rule.
 * Builds outside `build <name>` write to the OS temp dir (never tracked files).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRouteTable } from './route-table-diff.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLAN = 'docs/plans/2026-10-14-leans-tab.md';
const ART = 'docs/plans/2026-10-14-leans-tab';
const IS_WIN = process.platform === 'win32';

/** Paths Leans must never touch (DECISIONS §3, §9 + prompt non-negotiables). */
const FROZEN = ['app/standings', 'components/standings', 'components/myteam', 'app/myteam'];
const FOOTER = '21+ · Info only, not betting advice · ';
const FOOTER_TAIL = 'Gambling problem? 1-800-GAMBLER';

// ── helpers ──────────────────────────────────────────────────────────────
const rows = [];
const record = (phase, name, ok, detail = '') => {
  rows.push({ phase, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${phase}] ${name}${detail ? `  — ${detail}` : ''}`);
};

const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8').replace(/\r\n/g, '\n');
const readJson = (p) => JSON.parse(read(p));

/** `shell` only for npm/npx (.cmd shims on Windows); a shell would split args with spaces. */
function sh(cmd, args, { quiet = false, shell = IS_WIN && (cmd === 'npm' || cmd === 'npx') } = {}) {
  const res = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell, maxBuffer: 64 * 1024 * 1024 });
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  if (!quiet && res.status !== 0) console.log(out.split('\n').slice(-40).join('\n'));
  return { code: res.status ?? 1, out, stdout: res.stdout ?? '' };
}
const git = (...args) => sh('git', args, { quiet: true });

function portFree(port = 4000) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, () => srv.close(() => resolve(true)));
  });
}

const tempDir = () => mkdtempSync(join(tmpdir(), 'pare-leans-gates-'));

/** Port check → clean → build; writes the build log to `outPath`. */
async function build(phase, outPath) {
  if (!(await portFree())) {
    record(phase, 'port 4000 free before build', false, 'stop npm run dev first');
    return false;
  }
  record(phase, 'port 4000 free before build', true);
  const clean = sh('npm', ['run', 'clean']);
  const res = sh('npm', ['run', 'build']);
  writeFileSync(outPath, res.out);
  record(phase, 'npm run clean + npm run build', clean.code === 0 && res.code === 0, `log → ${outPath}`);
  return res.code === 0;
}

const npmCheck = (phase) => record(phase, 'npm run check', sh('npm', ['run', 'check']).code === 0);
const npmTest = (phase) => record(phase, 'npm run test:run', sh('npm', ['run', 'test:run']).code === 0);

/** Run vitest with the JSON reporter → { passed, failed, names }. */
function vitestJson(files) {
  const out = join(tempDir(), 'vitest.json');
  sh('npx', ['vitest', 'run', ...files, '--reporter=json', `--outputFile=${out}`], { quiet: true });
  if (!existsSync(out)) return { passed: 0, failed: -1, names: [] };
  const j = JSON.parse(readFileSync(out, 'utf8'));
  const names = j.testResults.flatMap((f) => f.assertionResults.map((a) => a.fullName ?? a.title));
  return { passed: j.numPassedTests, failed: j.numFailedTests + (j.numRuntimeErrorTestSuites ?? 0), names };
}

/** Wrap a static check so a thrown error becomes a FAIL row, not a crash. */
function check(phase, name, fn) {
  try {
    const res = fn();
    const [ok, detail] = Array.isArray(res) ? res : [Boolean(res), ''];
    record(phase, name, ok, detail);
  } catch (err) {
    record(phase, name, false, err instanceof Error ? err.message : String(err));
  }
}

const has = (p, ...needles) => {
  const text = read(p);
  const missing = needles.filter((n) => (n instanceof RegExp ? !n.test(text) : !text.includes(n)));
  return [missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : ''];
};
const lacks = (p, re) => {
  const m = read(p).match(re);
  return [!m, m ? `found "${m[0]}"` : ''];
};
const filesExist = (...files) => {
  const missing = files.filter((f) => !existsSync(abs(f)));
  return [missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : ''];
};
const unchangedVsMain = (...paths) => {
  const changed = git('diff', '--name-only', 'main', '--', ...paths).stdout.trim();
  const untracked = git('ls-files', '--others', '--exclude-standard', '--', ...paths).stdout.trim();
  const all = [changed, untracked].filter(Boolean).join(', ');
  return [all === '', all];
};

/** Every .ts/.tsx file under the given dirs (tests excluded). */
function sourceFiles(...dirs) {
  const out = [];
  const walk = (d) => {
    if (!existsSync(abs(d))) return;
    for (const name of readdirSync(abs(d))) {
      const p = `${d}/${name}`;
      if (statSync(abs(p)).isDirectory()) {
        if (name !== '__tests__') walk(p);
      } else if (/\.tsx?$/.test(name)) out.push(p);
    }
  };
  dirs.forEach(walk);
  return out;
}

/** Strip comments + string/template literal bodies so only code literals remain. */
function codeOnly(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

// ── shared checks ────────────────────────────────────────────────────────
function routeRule(phase, afterPath) {
  check(phase, 'route table = build-l0 + only /leans* and /api/leans*', () => {
    const before = parseRouteTable(read(`${ART}/build-l0.txt`));
    const after = parseRouteTable(readFileSync(afterPath, 'utf8'));
    const failures = [];
    if (before.size === 0) failures.push('build-l0: no route table');
    for (const must of ['/leans', '/standings']) if (!after.has(must)) failures.push(`${must}: not in build`);
    for (const [route, b] of before) {
      const a = after.get(route);
      if (!a) failures.push(`${route}: missing`);
      else if (route.startsWith('/api') ? a.symbol !== b.symbol : a.symbol !== b.symbol || a.tokens !== b.tokens) {
        failures.push(`${route}: ${b.symbol} [${b.tokens}] → ${a.symbol} [${a.tokens}]`);
      }
    }
    for (const route of after.keys()) {
      if (!before.has(route) && !/^\/(api\/)?leans(\/|$)/.test(route)) failures.push(`${route}: new, not a Leans route`);
    }
    return [failures.length === 0, failures.join('; ')];
  });
}

const SHARED_LEANS = [
  ['frozen paths unchanged vs main (standings, myteam)', () => unchangedVsMain(...FROZEN)],
  ['components/schedule/MatchupCard.tsx unchanged vs main', () => unchangedVsMain('components/schedule/MatchupCard.tsx')],
  ['no new dependencies (package.json + lock unchanged)', () => git('diff', '--exit-code', 'main', '--', 'package.json', 'package-lock.json').code === 0],
  ['no #hex in components/leans + app/leans', () => {
    // 3/6/8 hex digits — rank text like "#24" (2 digits) never matches.
    const hits = sourceFiles('components/leans', 'app/leans').filter((f) => /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/.test(read(f)));
    return [hits.length === 0, hits.join(', ')];
  }],
  ['no raw palette classes in components/leans + app/leans', () => {
    const re = /(bg|text|border|divide|from|to|via|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]/;
    const hits = sourceFiles('components/leans', 'app/leans').filter((f) => re.test(read(f)));
    return [hits.length === 0, hits.join(', ')];
  }],
  ['no `any` in Leans code', () => {
    const hits = sourceFiles('components/leans', 'app/leans', 'lib/leans', 'app/api/leans').filter((f) => /:\s*any\b|as any\b|<any>/.test(codeOnly(read(f))));
    return [hits.length === 0, hits.join(', ')];
  }],
  ['vitest leansCopy.test.ts (banned words + sportsbook names)', () => {
    const r = vitestJson(['lib/__tests__/leansCopy.test.ts']);
    return [r.failed === 0 && r.passed >= 3, `${r.passed} passed, ${r.failed} failed`];
  }],
  ['every /leans page renders LeansFooter (page → Screen → View)', () => {
    // Each route page renders a *Screen container; it (or a *View it imports) renders the footer.
    const footerIn = (f) => existsSync(abs(f)) && read(f).includes('<LeansFooter');
    const viewsOf = (f) => (existsSync(abs(f)) ? [...read(f).matchAll(/from '\.\/(\w+View)'/g)].map((m) => `components/leans/${m[1]}.tsx`) : []);
    const pages = sourceFiles('app/leans').filter((f) => f.endsWith('/page.tsx'));
    const bad = pages.filter((page) => {
      const screens = [...read(page).matchAll(/from '@\/components\/leans\/(\w+)'/g)].map((m) => `components/leans/${m[1]}.tsx`);
      return !screens.some((s) => footerIn(s) || viewsOf(s).some(footerIn));
    });
    return [pages.length > 0 && bad.length === 0, bad.length ? `no footer: ${bad.join(', ')}` : `${pages.length} routes`];
  }],
];

// ── static checks per phase ──────────────────────────────────────────────
const STATIC = {
  l0: [
    ['gate script exists', () => filesExist('scripts/leans-gates.mjs')],
    ['build-l0.txt lists /, /compare, /standings, /leaderboards, /myteam', () =>
      has(`${ART}/build-l0.txt`, /[┌├└] [○●ƒ◐] \/\s/, '/compare', '/standings', '/leaderboards', '/myteam')],
    ['odds fixture: ≥3 events with moneyline away + home', () => {
      const evs = readJson('lib/__fixtures__/espn/scoreboard-odds.json').events ?? [];
      const n = evs.filter((e) => e.competitions?.[0]?.odds?.[0]?.moneyline?.away?.close?.odds && e.competitions[0].odds[0].moneyline.home?.close?.odds).length;
      return [n >= 3, `${n} events`];
    }],
    ['odds fixture has no sportsbook names / links', () => lacks('lib/__fixtures__/espn/scoreboard-odds.json', /draftkings|fanduel|href/i)],
    ['vitest dataFacts.test.ts ≥9 passed, 0 failed', () => {
      const r = vitestJson(['lib/leans/__tests__/dataFacts.test.ts']);
      return [r.failed === 0 && r.passed >= 9, `${r.passed} passed, ${r.failed} failed`];
    }],
    ['plan has no TBD-L0', () => lacks(PLAN, /(?<!`)TBD-L0(?!`)/)],
  ],
  l1: [
    ['BottomNav: one ITEMS array, Home · Compare · Leans · Leaders · Fantasy, Scale icon', () => {
      const text = read('components/BottomNav.tsx');
      const itemsDecls = text.match(/const ITEMS\b/g)?.length ?? 0;
      const block = text.slice(text.indexOf('const ITEMS'), text.indexOf('];', text.indexOf('const ITEMS')));
      const labels = [...block.matchAll(/label: '([^']+)'/g)].map((m) => m[1]).join(' · ');
      const ok = itemsDecls === 1 && labels === 'Home · Compare · Leans · Leaders · Fantasy' && /\bScale\b/.test(text);
      return [ok, `${itemsDecls} ITEMS, labels: ${labels}`];
    }],
    ['BottomNav exports a STANDINGS item', () => has('components/BottomNav.tsx', /export const STANDINGS\b/, "href: '/standings'")],
    ['Home header: 44px ListOrdered link to /standings', () => has('components/schedule/ScheduleScreen.tsx', 'ListOrdered', 'href="/standings"')],
    ['/leans page + shell + footer exist', () => filesExist('app/leans/page.tsx', 'components/leans/LeansFooter.tsx', 'components/leans/LeansHeader.tsx')],
    ['footer copy exact', () => has('components/leans/LeansFooter.tsx', FOOTER, FOOTER_TAIL)],
    ['header: "Pare" + gold-bright LEANS + WeekControl', () => has('components/leans/LeansHeader.tsx', 'LEANS', 'var(--gold-bright)', 'WeekControl')],
    ['frozen paths unchanged vs main (standings, myteam)', () => unchangedVsMain(...FROZEN)],
  ],
  l2: [
    ['MatchupCard.tsx unchanged vs main', () => unchangedVsMain('components/schedule/MatchupCard.tsx')],
    ['MatchupOdds keeps spread string + overUnder', () => has('lib/schedule.ts', /spread: string;/, /overUnder: number \| null;/)],
    ['MatchupOdds adds moneyline + spreadLine', () => has('lib/schedule.ts', /moneyline\?:/, /spreadLine\?:/)],
    ['one mapEspnScoreboard definition', () => {
      const out = git('grep', '--untracked', '-c', 'function mapEspnScoreboard', '--', 'app', 'components', 'lib', 'utils', 'config').stdout;
      const total = out.split('\n').filter(Boolean).reduce((n, l) => n + Number(l.split(':').pop()), 0);
      return [total === 1, `${total}`];
    }],
    ['vitest espnOdds.test.ts ≥6 passed, 0 failed', () => {
      const r = vitestJson(['lib/__tests__/espnOdds.test.ts']);
      return [r.failed === 0 && r.passed >= 6, `${r.passed} passed, ${r.failed} failed`];
    }],
  ],
  l3: [
    ['engine files exist', () => filesExist('lib/leans/config.ts', 'lib/leans/types.ts', 'lib/leans/propLean.ts', 'lib/leans/gameLean.ts')],
    ['vitest propLean + gameLean: 0 failed, required cases present', () => {
      const r = vitestJson(['lib/leans/__tests__/propLean.test.ts', 'lib/leans/__tests__/gameLean.test.ts']);
      const phrases = ['3/4 + 4/6 + Great → over', '2/4 + 3/6 + Avg → none', '3 games → not-enough', 'under mirror', 'total over', 'total under', 'total none'];
      const missing = phrases.filter((p) => !r.names.some((n) => n.includes(p)));
      return [r.failed === 0 && r.passed >= phrases.length && missing.length === 0, `${r.passed} passed, ${r.failed} failed${missing.length ? `; missing: ${missing.join(' | ')}` : ''}`];
    }],
    ['no threshold literals outside config.ts', () => {
      // The engine = every lib/leans/*Lean.ts file (+ players.ts, which applies the per-team caps),
      // + the prop engine v2 files (signals, tables, roles, combine — 2026-10-23).
      const files = sourceFiles('lib/leans').filter((f) => /Lean\.ts$|\/(players|propSignals|tables|roles|combine)\.ts$/.test(f));
      // 0, 1 and the percent scale 100 are fine; any other number (incl. 0.6) is a threshold.
      const bad = files.filter((f) => /(?<![\w.$])(?!100(?![\w.]))(?:[2-9]|[1-9]\d+|0\.\d+)(?:\.\d+)?(?![\w.])/.test(codeOnly(read(f))));
      return [bad.length === 0, bad.join(', ')];
    }],
  ],
  l4: [
    ['list files exist', () => filesExist('app/api/leans/data/route.ts', 'lib/leans/bundle.ts', 'lib/leans/client.ts', 'components/leans/LeansScreen.tsx', 'components/leans/GameCard.tsx', 'components/leans/LeanPill.tsx')],
    ['bundle.ts is server-only; route is force-dynamic', () => {
      const [a, da] = has('lib/leans/bundle.ts', "import 'server-only'");
      const [b, db] = has('app/api/leans/data/route.ts', "dynamic = 'force-dynamic'");
      return [a && b, [da, db].filter(Boolean).join('; ')];
    }],
    ['vitest leansRender list cases', () => {
      const r = vitestJson(['lib/leans/__tests__/leansRender.test.ts']);
      const need = ['list: footer', 'list: lean pill', 'list: No lean'];
      const missing = need.filter((p) => !r.names.some((n) => n.includes(p)));
      return [r.failed === 0 && missing.length === 0, `${r.passed} passed, ${r.failed} failed${missing.length ? `; missing ${missing.join(', ')}` : ''}`];
    }],
  ],
  l5: [
    ['game screen files exist', () => filesExist('app/leans/[gameId]/page.tsx', 'components/leans/GameScreen.tsx', 'components/leans/GameLinesCard.tsx')],
    ['MatchupHero: opt-in interactive prop, default true', () => has('components/compare/MatchupHero.tsx', /interactive\?: boolean/, /interactive = true/)],
    ['ComparePane: opt-in showHero, default true', () => has('components/compare/ComparePane.tsx', /showHero\?: boolean/, /showHero = true/)],
    ['vitest leansRender game cases', () => {
      const r = vitestJson(['lib/leans/__tests__/leansRender.test.ts']);
      const need = ['game: footer', 'game: lean pill', 'game: No lean', 'game: 3 signals', 'game: props empty'];
      const missing = need.filter((p) => !r.names.some((n) => n.includes(p)));
      return [r.failed === 0 && missing.length === 0, `${r.passed} passed, ${r.failed} failed${missing.length ? `; missing ${missing.join(', ')}` : ''}`];
    }],
  ],
  // l6 rewritten 2026-10-23: typed prop lines retired (Wave B2) — props come from the book feed
  // (lib/leans/propLines.ts + autoProps.ts, /api/leans/props); the old store + sheets are in _to-delete/.
  l6: [
    ['prop files exist', () => filesExist('lib/leans/propLines.ts', 'lib/leans/autoProps.ts', 'lib/leans/propLinesServer.ts', 'app/api/leans/props/route.ts', 'components/leans/PropCard.tsx', 'app/leans/prop/[propId]/page.tsx')],
    ['typed-line flow is gone (store + sheets retired)', () => {
      const gone = ['lib/leans/propStore.ts', 'components/leans/AddLineSheet.tsx', 'components/leans/PlayerPickerSheet.tsx', 'components/leans/GamePickSheet.tsx'].filter((p) => existsSync(abs(p)));
      return [gone.length === 0, gone.join(', ')];
    }],
    ['retired device store is cleared on the Leans tab', () => has('components/leans/LeansScreen.tsx', /pare:leans-props:v1/, /removeItem\(/)],
    ['vitest autoProps (book lines → props)', () => {
      const r = vitestJson(['lib/leans/__tests__/autoProps.test.ts']);
      const need = ['merges the over + under items', 'one unpriced line is the line', 'opening line', 'round-trip'];
      const missing = need.filter((p) => !r.names.some((n) => n.includes(p)));
      return [r.failed === 0 && missing.length === 0, `${r.passed} passed, ${r.failed} failed${missing.length ? `; missing ${missing.join(', ')}` : ''}`];
    }],
    ['vitest leansRender prop cases', () => {
      const r = vitestJson(['lib/leans/__tests__/leansRender.test.ts']);
      const need = ['prop: footer', 'prop: lean pill', 'prop: No lean', 'prop: not enough', 'game: leans show'];
      const missing = need.filter((p) => !r.names.some((n) => n.includes(p)));
      return [r.failed === 0 && missing.length === 0, `${r.passed} passed, ${r.failed} failed${missing.length ? `; missing ${missing.join(', ')}` : ''}`];
    }],
    ['no user data out: /api/leans/props takes a week number only', () => has('app/api/leans/props/route.ts', /searchParams\.get\('week'\)/)],
  ],
  l7: [
    ['player screen files exist', () => filesExist('app/leans/player/[playerId]/page.tsx', 'components/leans/PlayerVsDefenseView.tsx')],
    ['vitest leansRender player cases', () => {
      const r = vitestJson(['lib/leans/__tests__/leansRender.test.ts']);
      const need = ['player: footer', 'player: allows the'];
      const missing = need.filter((p) => !r.names.some((n) => n.includes(p)));
      return [r.failed === 0 && missing.length === 0, `${r.passed} passed, ${r.failed} failed${missing.length ? `; missing ${missing.join(', ')}` : ''}`];
    }],
    ['design-system: §9 rule 3 Leans amendment + §9.5', () => has('docs/design-system.md', /Amendment \(Leans/, /### 9\.5 Leans/)],
    ['docs: DATA_SOURCES, CHANGELOG, devnote, CLAUDE.md nav line', () => {
      const [a, da] = has('DATA_SOURCES.md', '/api/leans/data');
      const [b, db] = has('CHANGELOG.md', 'Leans tab');
      const [c, dc] = filesExist('docs/devnotes/2026-10-14-leans-tab.md');
      const [d, dd] = has('CLAUDE.md', /Home · Compare · Leans · Leaders · Fantasy/);
      return [a && b && c && d, [da, db, dc, dd].filter(Boolean).join('; ')];
    }],
    ['after/ has one PNG per screen row', () => {
      const need = ['A2-nav', 'A2-bets-list', 'A2b-bets-list-saved', 'A2b-G2-closed', 'A2b-G2-open', 'B2-game-line-lean', 'B2-empty',
        'B2-add-line', 'B2-prop-lean-over', 'B2-no-lean', 'B1-player-picker', 'B1-player-vs-defense'];
      const missing = need.filter((n) => !existsSync(abs(`${ART}/after/${n}.png`)));
      return [missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : `${need.length} PNGs`];
    }],
    ['plan status = built, human gate pending', () => has(PLAN, 'status: **built, human gate pending**')],
  ],
};

function runStatic(phase, label = phase) {
  for (const [name, fn] of STATIC[phase]) check(label, name, fn);
}
function runShared(label) {
  for (const [name, fn] of SHARED_LEANS) check(label, name, fn);
}

// ── phases ───────────────────────────────────────────────────────────────
async function withBuild(phase) {
  const out = join(tempDir(), `build-${phase}.txt`);
  if (await build(phase, out)) routeRule(phase, out);
}

const PHASES = {
  async l0() { runStatic('l0'); npmCheck('l0'); npmTest('l0'); },
  async l1() { runStatic('l1'); npmCheck('l1'); npmTest('l1'); await withBuild('l1'); },
  async l2() { runStatic('l2'); npmCheck('l2'); npmTest('l2'); },
  async l3() { runStatic('l3'); npmCheck('l3'); npmTest('l3'); },
  async l4() { runStatic('l4'); runShared('l4'); npmCheck('l4'); npmTest('l4'); await withBuild('l4'); },
  async l5() { runStatic('l5'); runShared('l5'); npmCheck('l5'); npmTest('l5'); await withBuild('l5'); },
  async l6() { runStatic('l6'); runShared('l6'); npmCheck('l6'); npmTest('l6'); await withBuild('l6'); },
  async l7() { runStatic('l7'); runShared('l7'); npmCheck('l7'); npmTest('l7'); await withBuild('l7'); },
  async all() {
    for (const p of Object.keys(STATIC)) runStatic(p, `all:${p}`);
    runShared('all');
    npmCheck('all');
    npmTest('all');
    await withBuild('all');
  },
};

async function main() {
  const [arg, name] = process.argv.slice(2);
  if (arg === 'build') {
    if (!name) throw new Error('usage: build <name>');
    const ok = await build(`build:${name}`, abs(`${ART}/build-${name}.txt`));
    process.exit(ok ? 0 : 1);
  }
  const phase = PHASES[arg];
  if (!phase) {
    console.error('usage: node scripts/leans-gates.mjs <l0|l1|l2|l3|l4|l5|l6|l7|all> | build <name>');
    process.exit(2);
  }
  await phase();

  const failed = rows.filter((r) => !r.ok);
  console.log(`\n${'─'.repeat(72)}\n${arg.toUpperCase()}: ${rows.length - failed.length}/${rows.length} PASS`);
  for (const r of failed) console.log(`FAIL  [${r.phase}] ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

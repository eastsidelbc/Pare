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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { mapEspnScoreboard, parseAmericanOdds, parseSpreadDetails, type EspnScoreboard } from '@/lib/espnScoreboard';
import { FORMULA_CONFIG } from '@/lib/formulas/config';
import { breakevenProb } from '@/lib/formulas/odds';
import { LEAN_CONFIG } from '@/lib/leans/config';
import {
  calibrate,
  hitPct,
  lineupCapSet,
  pickMainLine,
  replayGameFormulas,
  replayGameLeans,
  replayPropFormula,
  replayPropLeans,
  roi,
  type BacktestGame,
  type BacktestProp,
  type PlayerSeason,
  type PropOffer,
  type TallyMap,
} from '@/lib/leans/backtest';
import { buildAthleteIndex, matchAthlete, type AthleteIndex } from '@/lib/leans/athleteMatch';
import { playedGame, toPlayerGame } from '@/lib/leans/players';
import { PROP_TYPES } from '@/lib/leans/propLines';
import { statValue } from '@/lib/leans/propLean';
import type { PropPosition, PropStat, TeamGame } from '@/lib/leans/types';
import { buildFpaTable } from '@/lib/myteam/fpa';
import { toGameLines, type SleeperComLineRaw } from '@/lib/myteam/sleeper/map';
import type { PlayerGameLine } from '@/lib/myteam/types';

const args = process.argv.slice(2);
const SEASON = Number(args.find((a) => /^\d{4}$/.test(a)) ?? 2025);
const REFRESH = args.includes('--refresh');
const WEEKS = 18;
const ROOT = join(process.cwd(), '.cache', 'leans-backtest', String(SEASON));
const REPORT_PATH = join(process.cwd(), 'docs', 'devnotes', '2026-10-23-leans-backtest', `report-${SEASON}.md`);

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
const SLEEPER_COM = 'https://api.sleeper.com';
const SLEEPER_APP = 'https://api.sleeper.app/v1';

const PROP_POSITIONS: readonly PropPosition[] = ['QB', 'RB', 'WR', 'TE'];
const EDGES = [1, 2, 3, 4, 5];
const PROBS = [0.55, 0.6, 0.65, 0.7];

// ── cached fetch ────────────────────────────────────────────────────────

let calls = 0;
let active = 0;
const queue: Array<() => void> = [];
const MAX_ACTIVE = 4;

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_ACTIVE) await new Promise<void>((r) => queue.push(r));
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    queue.shift()?.();
  }
}

async function getJson<T>(url: string, cacheKey: string): Promise<T | null> {
  const file = join(ROOT, `${cacheKey}.json`);
  if (!REFRESH && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as T;
  const data = await slot(async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      calls += 1;
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return (await res.json()) as T;
    }
    throw new Error(`gave up after retries: ${url}`);
  });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data));
  return data;
}

const https = (ref: string) => ref.replace(/^http:/, 'https:');

// ── ESPN shapes (only what we read) ─────────────────────────────────────

interface EspnPrice {
  american?: string;
}
interface EspnOpenValue {
  american?: string;
}
interface EspnOddsItem {
  provider?: { id?: string; name?: string };
  details?: string;
  overUnder?: number;
  /** Opening total, e.g. { american: "43.5" }. */
  open?: { total?: EspnOpenValue };
  /** Opening home spread lives at homeTeamOdds.open.pointSpread ({ american: "-4.5" }). */
  homeTeamOdds?: { moneyLine?: number; open?: { pointSpread?: EspnOpenValue } };
  awayTeamOdds?: { moneyLine?: number };
  propBets?: { $ref?: string };
}
interface EspnPaged<T> {
  items?: T[];
  pageCount?: number;
}
interface EspnPropSide {
  target?: { value?: number };
  over?: EspnPrice;
  under?: EspnPrice;
}
interface EspnPropBet {
  athlete?: { $ref?: string };
  type?: { id?: string };
  /**
   * `open` = the pregame opening line. On a finished game `current` keeps moving after kickoff
   * (in-game) — e.g. Dak W1 rush yds open 7.5 → "current" 3.5 at +130, updated hours after the
   * final — so grading against it would leak the result. Always grade on `open`.
   */
  open?: EspnPropSide;
}
interface SleeperPlayer {
  espn_id?: string | number | null;
  position?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}
interface EspnAthleteRaw {
  fullName?: string;
  position?: { abbreviation?: string };
}

const numOrNull = (v: string | undefined) => {
  const n = Number(v);
  return v !== undefined && v !== '' && Number.isFinite(n) ? n : null;
};

/** In-game books carry live prices (a final game shows the end-of-game line) — never a pregame line. */
const isLiveBook = (o: EspnOddsItem) => /live/i.test(o.provider?.name ?? '');

// ── load ────────────────────────────────────────────────────────────────

async function loadGames(): Promise<{ games: BacktestGame[]; teamLog: TeamGame[]; propBooks: Map<string, string> }> {
  const games: BacktestGame[] = [];
  const teamLog: TeamGame[] = [];
  const propBooks = new Map<string, string>();
  const boards = await Promise.all(
    Array.from({ length: WEEKS }, (_, i) =>
      getJson<EspnScoreboard>(`${SITE}/scoreboard?seasontype=2&week=${i + 1}&dates=${SEASON}`, `scoreboard/w${i + 1}`),
    ),
  );
  const finals = boards.flatMap((b, i) => (b ? mapEspnScoreboard(b, i + 1) : [])).filter((m) => m.completed && m.espnEventId && m.awayScore !== null && m.homeScore !== null);
  await Promise.all(
    finals.map(async (m) => {
      const id = m.espnEventId as string;
      const odds = await getJson<EspnPaged<EspnOddsItem>>(`${CORE}/events/${id}/competitions/${id}/odds`, `odds/${id}`);
      const pregame = (odds?.items ?? []).filter((o) => !isLiveBook(o));
      const book = pregame.find((o) => o.details) ?? null;
      const propBook = pregame.find((o) => o.propBets?.$ref);
      if (propBook?.propBets?.$ref) propBooks.set(id, https(propBook.propBets.$ref));
      const home = book?.homeTeamOdds?.moneyLine ?? null;
      const away = book?.awayTeamOdds?.moneyLine ?? null;
      games.push({
        eventId: id,
        week: m.week,
        away: m.away.abbr,
        home: m.home.abbr,
        awayScore: m.awayScore as number,
        homeScore: m.homeScore as number,
        spreadLine: parseSpreadDetails(book?.details),
        hasSpread: !!book?.details,
        total: book?.overUnder ?? null,
        moneyline: home === null && away === null ? null : { away, home },
        openHomeLine: numOrNull(book?.homeTeamOdds?.open?.pointSpread?.american),
        openTotal: numOrNull(book?.open?.total?.american),
      });
      teamLog.push(
        { team: m.away.abbr, opp: m.home.abbr, week: m.week, points: m.awayScore as number, pointsAllowed: m.homeScore as number },
        { team: m.home.abbr, opp: m.away.abbr, week: m.week, points: m.homeScore as number, pointsAllowed: m.awayScore as number },
      );
    }),
  );
  games.sort((a, b) => a.week - b.week || a.eventId.localeCompare(b.eventId));
  return { games, teamLog, propBooks };
}

async function loadLines(): Promise<PlayerGameLine[]> {
  const qs = PROP_POSITIONS.map((p) => `position[]=${p}`).join('&');
  const weeks = await Promise.all(
    Array.from({ length: WEEKS }, (_, i) =>
      getJson<SleeperComLineRaw[]>(`${SLEEPER_COM}/stats/nfl/${SEASON}/${i + 1}?season_type=regular&${qs}`, `sleeper/w${i + 1}`),
    ),
  );
  return weeks.flatMap((w) => toGameLines(w));
}

/** Prop lines joined to Sleeper players; `join` counts how each join was made (report). */
async function loadProps(
  games: readonly BacktestGame[],
  propBooks: ReadonlyMap<string, string>,
  lines: readonly PlayerGameLine[],
): Promise<{ props: BacktestProp[]; join: { byId: number; byName: number; unmatched: number } }> {
  const map = (await getJson<Record<string, SleeperPlayer>>(`${SLEEPER_APP}/players/nfl`, 'sleeper/players')) ?? {};
  const nameOf = (p: SleeperPlayer | undefined) => p?.full_name ?? `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim();
  const espnOf = (id: string) => (map[id]?.espn_id != null ? String(map[id]?.espn_id) : undefined);
  // The old id-only join (today's map) — fallback for a player with no row that week.
  const byEspn = new Map<string, string>();
  for (const [id, p] of Object.entries(map)) if (p.espn_id != null && (PROP_POSITIONS as readonly string[]).includes(p.position ?? '')) byEspn.set(String(p.espn_id), id);
  // Per-week index from that week's rows: team-at-week (trades) + position-at-week.
  const weekIdx = new Map<number, AthleteIndex>();
  const idxFor = (week: number) => {
    let idx = weekIdx.get(week);
    if (!idx) {
      idx = buildAthleteIndex(
        lines
          .filter((l) => l.week === week && (PROP_POSITIONS as readonly string[]).includes(l.position))
          .map((l) => ({ id: l.playerId, name: nameOf(map[l.playerId]), position: l.position, team: l.team, espnId: espnOf(l.playerId) })),
      );
      weekIdx.set(week, idx);
    }
    return idx;
  };
  const lineOf = new Map(lines.map((l) => [`${l.playerId}|${l.week}`, l] as const));
  const join = { byId: 0, byName: 0, unmatched: 0 };
  const out: BacktestProp[] = [];
  await Promise.all(
    games.map(async (g) => {
      const ref = propBooks.get(g.eventId);
      if (!ref) return;
      const base = `${ref}${ref.includes('?') ? '&' : '?'}limit=1000`;
      const first = await getJson<EspnPaged<EspnPropBet>>(`${base}&page=1`, `props/${g.eventId}-p1`);
      const pages = [first];
      for (let p = 2; p <= (first?.pageCount ?? 1); p++) pages.push(await getJson<EspnPaged<EspnPropBet>>(`${base}&page=${p}`, `props/${g.eventId}-p${p}`));
      const offers = new Map<string, PropOffer[]>();
      for (const item of pages.flatMap((pg) => pg?.items ?? [])) {
        const stat = PROP_TYPES[item.type?.id ?? ''];
        const athlete = /athletes\/(\d+)/.exec(item.athlete?.$ref ?? '')?.[1];
        const target = item.open?.target?.value;
        if (!stat || !athlete || typeof target !== 'number') continue;
        const key = `${athlete}|${stat}`;
        const list = offers.get(key) ?? [];
        list.push({ target, over: parseAmericanOdds(item.open?.over?.american), under: parseAmericanOdds(item.open?.under?.american) });
        offers.set(key, list);
      }
      const idx = idxFor(g.week);
      const teams = [g.away, g.home];
      for (const [key, list] of offers) {
        const [athlete, stat] = key.split('|') as [string, PropStat];
        const main = pickMainLine(list);
        if (!main) continue;
        let playerId = idx.byEspn.get(athlete) ?? byEspn.get(athlete) ?? null;
        if (playerId) join.byId += 1;
        else {
          const a = await getJson<EspnAthleteRaw>(`${CORE}/seasons/${SEASON}/athletes/${athlete}`, `athletes/${athlete}`);
          playerId = matchAthlete(idx, { espnId: athlete, name: a?.fullName, position: a?.position?.abbreviation, teams });
          if (!playerId) {
            join.unmatched += 1;
            continue;
          }
          join.byName += 1;
        }
        const played = lineOf.get(`${playerId}|${g.week}`);
        const position = played?.position ?? map[playerId]?.position ?? '';
        if (!(PROP_POSITIONS as readonly string[]).includes(position)) continue;
        out.push({
          eventId: g.eventId,
          week: g.week,
          playerId,
          position: position as PropPosition,
          opp: played?.opponent ?? '',
          stat,
          line: main.target,
          overPrice: main.over,
          underPrice: main.under,
        });
      }
    }),
  );
  const cap = lineupCapSet(lines);
  for (const p of out) p.capped = cap.has(`${p.playerId}|${p.week}`);
  return { props: out, join };
}

function playerSeasons(lines: readonly PlayerGameLine[]): Map<string, PlayerSeason> {
  const out = new Map<string, PlayerSeason>();
  for (const l of [...lines].sort((a, b) => a.week - b.week)) {
    if (!(PROP_POSITIONS as readonly string[]).includes(l.position) || !playedGame(l)) continue;
    const s = out.get(l.playerId) ?? { playerId: l.playerId, position: l.position as PropPosition, games: [] };
    s.games.push(toPlayerGame(l));
    out.set(l.playerId, s);
  }
  return out;
}

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
  const { games, teamLog, propBooks } = await loadGames();
  const lines = await loadLines();
  const { props, join } = await loadProps(games, propBooks, lines);
  const cappedProps = props.filter((p) => p.capped);
  const players = playerSeasons(lines);
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

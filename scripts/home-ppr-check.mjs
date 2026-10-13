#!/usr/bin/env node
/**
 * Home Sleeper PPR — P0 check (dev-only; never imported by the app).
 * Plan: docs/plans/2026-10-12-home-sleeper-ppr.md
 *
 *   node scripts/home-ppr-check.mjs
 *
 * Three outbound calls, sequential, ≥300 ms apart:
 *   1. ESPN scoreboard week 5 → the DAL game's event id
 *   2. Sleeper week-5 QB stat lines → Dak Prescott's pts_ppr + raw stats
 *   3. ESPN summary for that event → header.week / header.season.year
 * Writes docs/plans/2026-10-12-home-sleeper-ppr/p0-check.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'docs/plans/2026-10-12-home-sleeper-ppr');
const ESPN_SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const SLEEPER_STATS = 'https://api.sleeper.com';
const SEASON = 2026;
const WEEK = 5;
const TEAM = 'DAL';
const PLAYER = { first: 'Dak', last: 'Prescott' };
const GAP_MS = 300;

// Today's homemade Home formula (lib/hooks/useGameSummary.ts `PPR`), for the "before" number only.
const OURS = { passYd: 0.04, passTd: 4, int: -2, rushYd: 0.1, rushTd: 6, rec: 1, recYd: 0.1, recTd: 6, fumLost: -2 };
// Sleeper standard PPR, as documented in the plan (explains the gap; the app never uses it).
const SLEEPER_PPR = { ...OURS, int: -1, twoPt: 2 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCallAt = 0;
async function getJson(url) {
  const wait = lastCallAt + GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  lastCallAt = Date.now();
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const n = (v) => (typeof v === 'number' ? v : 0);
const round2 = (v) => Math.round(v * 100) / 100;
function score(s, w) {
  const twoPt = n(s.pass_2pt) + n(s.rush_2pt) + n(s.rec_2pt);
  return round2(
    n(s.pass_yd) * w.passYd + n(s.pass_td) * w.passTd + n(s.pass_int) * w.int +
    n(s.rush_yd) * w.rushYd + n(s.rush_td) * w.rushTd +
    n(s.rec) * w.rec + n(s.rec_yd) * w.recYd + n(s.rec_td) * w.recTd +
    n(s.fum_lost) * w.fumLost + twoPt * (w.twoPt ?? 0),
  );
}

// 1. ESPN scoreboard → DAL event
const board = await getJson(`${ESPN_SITE}/scoreboard?seasontype=2&week=${WEEK}&dates=${SEASON}`);
const event = (board.events ?? []).find((e) =>
  e.competitions?.[0]?.competitors?.some((c) => c.team?.abbreviation === TEAM),
);
if (!event) throw new Error(`no ${TEAM} game in ESPN week ${WEEK}`);
const comp = event.competitions[0];

// 2. Sleeper week-5 QB lines → Dak
const lines = await getJson(`${SLEEPER_STATS}/stats/nfl/${SEASON}/${WEEK}?season_type=regular&position[]=QB`);
const dak = (Array.isArray(lines) ? lines : Object.values(lines)).find(
  (l) => l.player?.first_name === PLAYER.first && l.player?.last_name === PLAYER.last,
);
if (!dak) throw new Error(`no Sleeper line for ${PLAYER.first} ${PLAYER.last} week ${WEEK}`);
const s = dak.stats ?? {};

// 3. ESPN summary → header week/season
const summary = await getJson(`${ESPN_SITE}/summary?event=${event.id}`);

const raw = {
  pass_yd: n(s.pass_yd), pass_td: n(s.pass_td), pass_int: n(s.pass_int),
  rush_yd: n(s.rush_yd), rush_td: n(s.rush_td), fum_lost: n(s.fum_lost),
  pass_2pt: n(s.pass_2pt), rush_2pt: n(s.rush_2pt), rec_2pt: n(s.rec_2pt),
  rec: n(s.rec), rec_yd: n(s.rec_yd), rec_td: n(s.rec_td),
};
const result = {
  checkedAt: new Date().toISOString(),
  season: SEASON,
  week: WEEK,
  espn: {
    eventId: event.id,
    name: event.name,
    date: event.date,
    completed: comp.status?.type?.completed === true,
    summaryHeaderWeek: summary.header?.week ?? null,
    summaryHeaderSeasonYear: summary.header?.season?.year ?? null,
  },
  sleeper: {
    playerId: dak.player_id,
    team: dak.team,
    gameId: dak.game_id,
    pts_ppr: typeof s.pts_ppr === 'number' ? s.pts_ppr : null,
    raw,
  },
  formula: {
    ours: score(s, OURS),
    sleeperRules: score(s, SLEEPER_PPR),
  },
};
result.formula.sleeperRulesMatch = result.sleeper.pts_ppr !== null && Math.abs(result.formula.sleeperRules - result.sleeper.pts_ppr) < 0.01;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'p0-check.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

#!/usr/bin/env node
/**
 * My Team — P0a data spike (dev-only; never imported by the app).
 *
 * Calls every endpoint the My Team plan depends on ONCE, sequentially (≥300 ms apart, no bursts),
 * saves raw responses OUTSIDE the repo, writes anonymized fixtures to lib/myteam/__fixtures__/,
 * and prints a summary answering the P0a checklist in docs/plans/my-team-fantasy.md.
 *
 * Usage (PowerShell):  $env:SLEEPER_USER='name'; node scripts/my-team-spike.mjs
 * Optional env: SLEEPER_LEAGUE (league_id), WEEK (last completed week), SPIKE_RAW_DIR.
 *
 * Real usernames / user ids / names are printed to the terminal only (for the grep check) and
 * written to a grep-pattern file inside SPIKE_RAW_DIR — never into the repo.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const USER = process.env.SLEEPER_USER?.trim();
if (!USER) {
  console.error('Set SLEEPER_USER first, e.g.  $env:SLEEPER_USER=\'name\'; node scripts/my-team-spike.mjs');
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX_DIR = path.join(ROOT, 'lib', 'myteam', '__fixtures__');
const RAW_DIR = process.env.SPIKE_RAW_DIR || path.join(os.tmpdir(), 'pare-my-team-spike');
fs.mkdirSync(FIX_DIR, { recursive: true });
fs.mkdirSync(RAW_DIR, { recursive: true });

const SLEEPER = 'https://api.sleeper.app/v1';
const SLEEPER_COM = 'https://api.sleeper.com';
const ESPN_SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
const SKILL = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const GAP_MS = 300;

// ───────────────────────── fetch (sequential, spaced, timed) ─────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCallAt = 0;
const calls = [];

async function get(label, url, { timeoutMs = 15_000, json = true } = {}) {
  const wait = lastCallAt + GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const body = await res.text();
    lastCallAt = Date.now();
    const rec = { label, status: res.status, ms: Date.now() - t0, bytes: Buffer.byteLength(body), headers: Object.fromEntries(res.headers) };
    calls.push(rec);
    fs.writeFileSync(path.join(RAW_DIR, `${label}.${json ? 'json' : 'txt'}`), body);
    let data;
    if (json) {
      try { data = JSON.parse(body); } catch { data = undefined; }
    }
    return { ...rec, data, body };
  } catch (err) {
    lastCallAt = Date.now();
    const rec = { label, status: 0, ms: Date.now() - t0, bytes: 0, headers: {}, error: String(err) };
    calls.push(rec);
    return { ...rec, data: undefined, body: '' };
  }
}

// ───────────────────────── anonymizer ─────────────────────────

/** Real strings that must never reach the repo (usernames, display/team/league names, user ids). */
const secrets = new Set();
const idMap = new Map();
const nameMap = new Map();

function fakeId(real) {
  if (!idMap.has(real)) {
    idMap.set(real, String(100000000000000000n + BigInt(idMap.size + 1)));
    secrets.add(real);
  }
  return idMap.get(real);
}
function fakeName(real, prefix) {
  const key = `${prefix}|${real}`;
  if (!nameMap.has(key)) {
    const n = [...nameMap.keys()].filter((k) => k.startsWith(`${prefix}|`)).length + 1;
    nameMap.set(key, `${prefix}${n}`);
    if (real.length >= 3) secrets.add(real);
  }
  return nameMap.get(key);
}

const USER_ID_KEYS = new Set(['user_id', 'owner_id', 'creator_id', 'commissioner_id']);
const USER_NAME_KEYS = new Set(['username', 'display_name']);

function anon(value, key = '') {
  if (Array.isArray(value)) {
    if (key === 'co_owners') return value.map((id) => (typeof id === 'string' ? fakeId(id) : id));
    return value.map((v) => anon(v));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/avatar/i.test(k)) { out[k] = null; continue; }
      if (k.startsWith('p_nick_')) continue; // free-text player nicknames
      if (k.startsWith('last_') && typeof v !== 'number') continue; // chat/author metadata
      out[k] = anon(v, k);
    }
    return out;
  }
  if (typeof value === 'string') {
    if (USER_ID_KEYS.has(key)) return fakeId(value);
    if (USER_NAME_KEYS.has(key)) return fakeName(value, 'user_');
    if (key === 'team_name') return fakeName(value, 'Team ');
  }
  return value;
}

/** Last line of defence: scrub any secret still inside a string value. */
function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v)]));
  if (typeof value === 'string') {
    let s = value;
    for (const sec of secrets) {
      if (s.toLowerCase().includes(sec.toLowerCase())) s = s.replace(new RegExp(sec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[redacted]');
    }
    return s;
  }
  return value;
}

/** Strip noisy ESPN presentation fields from fixtures. */
function stripEspn(value) {
  if (Array.isArray(value)) return value.map(stripEspn);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (['links', 'headlines', 'videos', 'logos', 'logo', 'longComment', 'shortComment', 'news', 'article'].includes(k)) continue;
      out[k] = stripEspn(v);
    }
    return out;
  }
  return value;
}

const written = [];
function writeFixture(name, data, pretty = true) {
  const file = path.join(FIX_DIR, name);
  const body = JSON.stringify(scrub(data), null, pretty ? 1 : 0) + '\n';
  fs.writeFileSync(file, body);
  written.push({ name, bytes: Buffer.byteLength(body) });
}

// ───────────────────────── helpers ─────────────────────────

const ESPN_ABBR_ALIAS = { WSH: 'WAS', JAC: 'JAX', LA: 'LAR' };
const normAbbr = (a) => ESPN_ABBR_ALIAS[a] ?? a;
const normName = (n) => String(n ?? '').toLowerCase().replace(/[.'’-]/g, '').replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '').replace(/\s+/g, ' ').trim();
const espnIdFromAthlete = (a) => a?.id ?? a?.links?.find((l) => /\/id\/\d+/.test(l.href))?.href.match(/\/id\/(\d+)/)?.[1];
const kb = (b) => `${(b / 1024).toFixed(0)} KB`;
const yes = (b) => (b ? 'YES' : 'NO');
const hr = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 70 - t.length))}`);

// ───────────────────────── run ─────────────────────────

console.log(`My Team spike — raw responses → ${RAW_DIR}`);

// [1] state + ESPN default scoreboard
const state = await get('sleeper-state', `${SLEEPER}/state/nfl`);
const espnNow = await get('espn-scoreboard-now', `${ESPN_SITE}/scoreboard`);
const season = Number(state.data?.season ?? espnNow.data?.season?.year);
const espnWeek = espnNow.data?.week?.number;
const lastDone = Number(process.env.WEEK) || Math.max(1, (espnWeek ?? 2) - 1);

// [2] user, not-found behaviour, leagues
const user = await get('sleeper-user', `${SLEEPER}/user/${encodeURIComponent(USER)}`);
if (!user.data?.user_id) {
  console.error(`Sleeper user lookup failed (status ${user.status}). Check SLEEPER_USER.`);
  process.exit(1);
}
const realUserId = user.data.user_id;
secrets.add(USER);
const notFound = await get('sleeper-user-notfound', `${SLEEPER}/user/pare_spike_nonexistent_zz9q`);
const leagues = await get('sleeper-leagues', `${SLEEPER}/user/${realUserId}/leagues/nfl/${season}`);
const leagueList = Array.isArray(leagues.data) ? leagues.data : [];
const leagueLetter = new Map(leagueList.map((l, i) => [l.league_id, `League ${String.fromCharCode(65 + i)}`]));
for (const l of leagueList) if (l.name) secrets.add(l.name);
const chosen =
  leagueList.find((l) => l.league_id === process.env.SLEEPER_LEAGUE) ??
  leagueList.find((l) => l.status === 'in_season') ??
  leagueList[0];
if (!chosen) {
  console.error(`No ${season} leagues for this user — nothing to spike.`);
  process.exit(1);
}
const L = chosen.league_id;

// [3] league detail, rosters, users, matchups (current + last completed)
const league = await get('sleeper-league', `${SLEEPER}/league/${L}`);
const rosters = await get('sleeper-rosters', `${SLEEPER}/league/${L}/rosters`);
const lusers = await get('sleeper-users', `${SLEEPER}/league/${L}/users`);
const sleeperWeek = state.data?.week;
const matchNow = await get('sleeper-matchups-now', `${SLEEPER}/league/${L}/matchups/${sleeperWeek}`);
const matchDone = await get('sleeper-matchups-done', `${SLEEPER}/league/${L}/matchups/${lastDone}`);
const preDraft = leagueList.find((l) => l.status === 'pre_draft' || l.status === 'drafting');
const preDraftRosters = preDraft ? await get('sleeper-rosters-predraft', `${SLEEPER}/league/${preDraft.league_id}/rosters`) : null;
for (const u of lusers.data ?? []) {
  if (u.user_id) fakeId(u.user_id);
  if (u.display_name?.length >= 3) secrets.add(u.display_name);
  if (u.metadata?.team_name?.length >= 3) secrets.add(u.metadata.team_name);
}
for (const r of rosters.data ?? []) {
  if (r.owner_id) fakeId(r.owner_id);
  for (const c of r.co_owners ?? []) fakeId(c);
}
fakeId(realUserId);

// [4] Sleeper docs (rate-limit guidance)
const docs = await get('sleeper-docs', 'https://docs.sleeper.com/', { json: false });

// [5] weekly stats — api.sleeper.com weeks 1..lastDone, api.sleeper.app lastDone
const posQs = SKILL.map((p) => `position[]=${p}`).join('&');
const comWeeks = [];
for (let w = 1; w <= lastDone; w++) {
  comWeeks.push({ w, res: await get(`sleeper-com-stats-w${w}`, `${SLEEPER_COM}/stats/nfl/${season}/${w}?season_type=regular&${posQs}`, { timeoutMs: 20_000 }) });
}
const appStats = await get(`sleeper-app-stats-w${lastDone}`, `${SLEEPER}/stats/nfl/regular/${season}/${lastDone}`, { timeoutMs: 20_000 });

// [6] Sleeper player map (≈20 MB, once)
const players = await get('sleeper-players', `${SLEEPER}/players/nfl`, { timeoutMs: 60_000 });

// [7] ESPN: teams, scoreboard (last completed), one box score, injuries (league-wide + core per-team shape)
const espnTeams = await get('espn-teams', `${ESPN_SITE}/teams`);
const espnBoard = await get(`espn-scoreboard-w${lastDone}`, `${ESPN_SITE}/scoreboard?seasontype=2&week=${lastDone}`);
const finalEvent = (espnBoard.data?.events ?? []).find((e) => e.competitions?.[0]?.status?.type?.completed);
const summaryRes = finalEvent ? await get('espn-summary', `${ESPN_SITE}/summary?event=${finalEvent.id}`) : null;
const injuries = await get('espn-injuries', `${ESPN_SITE}/injuries`, { timeoutMs: 20_000 });
const coreInj = await get('espn-core-injuries-kc', `${ESPN_CORE}/teams/12/injuries`);

// [8] nflverse release assets
const nflA = await get('nflverse-stats_player', 'https://api.github.com/repos/nflverse/nflverse-data/releases/tags/stats_player');
const nflB = await get('nflverse-player_stats', 'https://api.github.com/repos/nflverse/nflverse-data/releases/tags/player_stats');

// ───────────────────────── analysis ─────────────────────────

const failed = calls.filter((c) => c.status !== 200 && c.label !== 'sleeper-user-notfound');
const myRoster = (rosters.data ?? []).find((r) => r.owner_id === realUserId || (r.co_owners ?? []).includes(realUserId));
const rosteredIds = new Set((rosters.data ?? []).flatMap((r) => [...(r.players ?? []), ...(r.reserve ?? []), ...(r.taxi ?? [])]));
const pmap = players.data ?? {};
const scoring = league.data?.scoring_settings ?? {};

// stats key union + team/opponent coverage
const statKeys = new Set();
const coverage = Object.fromEntries(SKILL.map((p) => [p, { n: 0, team: 0, opp: 0 }]));
for (const { res } of comWeeks) {
  for (const line of Array.isArray(res.data) ? res.data : []) {
    const pos = line.player?.position;
    for (const k of Object.keys(line.stats ?? {})) statKeys.add(k);
    if (coverage[pos]) {
      coverage[pos].n++;
      if (line.team) coverage[pos].team++;
      if (line.opponent) coverage[pos].opp++;
    }
  }
}
for (const s of Object.values(appStats.data ?? {})) for (const k of Object.keys(s ?? {})) statKeys.add(k);
const scoringKeys = Object.keys(scoring);
const unmapped = scoringKeys.filter((k) => !statKeys.has(k));
const unmappedNonZero = unmapped.filter((k) => Number(scoring[k]) !== 0);
const comAllTeamOpp = SKILL.every((p) => coverage[p].n > 0 && coverage[p].team === coverage[p].n && coverage[p].opp === coverage[p].n);

// box score fields
const teamStatNames = (summaryRes?.data?.boxscore?.teams?.[0]?.statistics ?? []).map((s) => s.name);
const playerCats = (summaryRes?.data?.boxscore?.players?.[0]?.statistics ?? []).map((c) => ({ name: c.name, labels: c.labels ?? [] }));
const hasStat = (re) => teamStatNames.some((n) => re.test(n));
const catHasTd = (cat) => playerCats.find((c) => c.name === cat)?.labels.includes('TD') ?? false;

// injuries — rule: ESPN clean if 32 teams, call <5s, every status maps, ≥95% of rostered injured players resolve
const STATUS_MAP = { Questionable: 'Q', Doubtful: 'D', Out: 'O', 'Injured Reserve': 'IR', Active: null };
const espnTeamAbbr = new Map(
  (espnTeams.data?.sports?.[0]?.leagues?.[0]?.teams ?? []).map((t) => [String(t.team.id), normAbbr(t.team.abbreviation)]),
);
const injTeams = injuries.data?.injuries ?? [];
const injStatuses = {};
const espnById = new Map();
const espnByName = new Map();
for (const t of injTeams) {
  const abbr = espnTeamAbbr.get(String(t.id));
  for (const i of t.injuries ?? []) {
    injStatuses[i.status] = (injStatuses[i.status] ?? 0) + 1;
    const eid = espnIdFromAthlete(i.athlete);
    if (eid) espnById.set(String(eid), i);
    espnByName.set(`${normName(i.athlete?.displayName)}|${abbr}`, i);
  }
}
const unmappedStatuses = Object.keys(injStatuses).filter((s) => !(s in STATUS_MAP));
const SLEEPER_INJ = new Set(['Questionable', 'Doubtful', 'Out', 'IR']);
const rosteredInjured = [...rosteredIds].filter((id) => SLEEPER_INJ.has(pmap[id]?.injury_status));
let resolvedById = 0;
let resolvedByName = 0;
let statusAgree = 0;
const toLetter = { Questionable: 'Q', Doubtful: 'D', Out: 'O', IR: 'IR' };
for (const id of rosteredInjured) {
  const p = pmap[id];
  let hit = p.espn_id ? espnById.get(String(p.espn_id)) : undefined;
  if (hit) resolvedById++;
  else {
    hit = espnByName.get(`${normName(p.full_name ?? `${p.first_name} ${p.last_name}`)}|${p.team}`);
    if (hit) resolvedByName++;
  }
  if (hit && STATUS_MAP[hit.status] === toLetter[p.injury_status]) statusAgree++;
}
const resolveRate = rosteredInjured.length ? (resolvedById + resolvedByName) / rosteredInjured.length : 0;
const injCallMs = calls.find((c) => c.label === 'espn-injuries')?.ms ?? Infinity;
const espnClean = injTeams.length === 32 && injCallMs < 5000 && unmappedStatuses.length === 0 && resolveRate >= 0.95;

// rate-limit / cache headers on Sleeper responses
const hdrRe = /rate|limit|retry|cache|^age$|^cf-|^x-|^via$|^server$/i;
const sleeperHdrs = {};
for (const c of calls.filter((c) => c.label.startsWith('sleeper-') && c.label !== 'sleeper-docs')) {
  for (const [k, v] of Object.entries(c.headers)) if (hdrRe.test(k)) (sleeperHdrs[k] ??= new Set()).add(v.length > 60 ? `${v.slice(0, 60)}…` : v);
}
const docsText = docs.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const docsQuote = docsText.match(/[^.]*1000 API calls[^.]*\./i)?.[0]?.trim();

const assetsFor = (r) => (r.data?.assets ?? []).map((a) => a.name).filter((n) => n.includes(String(season)));

// ───────────────────────── fixtures ─────────────────────────

writeFixture('sleeper-state.json', state.data);
writeFixture('sleeper-user.json', anon(user.data));
writeFixture('sleeper-user-notfound.json', { status: notFound.status, body: notFound.body.slice(0, 200) });
writeFixture('sleeper-leagues.json', leagueList.map((l) => ({ ...anon(l), name: leagueLetter.get(l.league_id), metadata: null })));
writeFixture('sleeper-league.json', { ...anon(league.data), name: leagueLetter.get(L), metadata: null });
writeFixture('sleeper-rosters.json', anon(rosters.data));
writeFixture(
  'sleeper-users.json',
  (lusers.data ?? []).map((u) => ({ ...anon({ ...u, metadata: undefined }), metadata: u.metadata?.team_name ? { team_name: fakeName(u.metadata.team_name, 'Team ') } : {} })),
);
writeFixture(`sleeper-matchups-w${sleeperWeek}.json`, matchNow.data);
writeFixture(`sleeper-matchups-w${lastDone}.json`, matchDone.data);
if (preDraftRosters) writeFixture('sleeper-rosters-predraft.json', anon(preDraftRosters.data));

const keepStat = new Set([...scoringKeys, 'pts_ppr', 'pts_half_ppr', 'pts_std', 'gp', ...[...statKeys].filter((k) => k.startsWith('fan_pts_allow'))]);
const trimStats = (s) => Object.fromEntries(Object.entries(s ?? {}).filter(([k]) => keepStat.has(k)));
const lastCom = comWeeks.find((c) => c.w === lastDone)?.res.data ?? [];
writeFixture(
  `sleeper-com-stats-w${lastDone}.json`,
  lastCom
    .filter((l) => SKILL.includes(l.player?.position) && (l.stats?.gp ?? 0) > 0)
    .map((l) => ({
      player_id: l.player_id, week: l.week, season: l.season, team: l.team, opponent: l.opponent, game_id: l.game_id, date: l.date,
      player: { position: l.player.position, first_name: l.player.first_name, last_name: l.player.last_name, injury_status: l.player.injury_status ?? null },
      stats: trimStats(l.stats),
    })),
  false,
);
const defAbbrs = new Set(lastCom.filter((l) => l.player?.position === 'DEF').map((l) => l.player_id));
writeFixture(
  `sleeper-app-stats-w${lastDone}.json`,
  Object.fromEntries(Object.entries(appStats.data ?? {}).filter(([id]) => rosteredIds.has(id) || defAbbrs.has(id)).map(([id, s]) => [id, trimStats(s)])),
  false,
);
writeFixture(
  'sleeper-players-slim.json',
  Object.fromEntries(
    [...rosteredIds].filter((id) => pmap[id]).map((id) => {
      const p = pmap[id];
      return [id, { full_name: p.full_name ?? `${p.first_name} ${p.last_name}`, position: p.position, team: p.team, injury_status: p.injury_status ?? null, espn_id: p.espn_id ?? null, fantasy_positions: p.fantasy_positions ?? null, years_exp: p.years_exp ?? null }];
    }),
  ),
);
writeFixture(`espn-scoreboard-w${lastDone}.json`, stripEspn(espnBoard.data), false);
if (summaryRes?.data) {
  const { header, boxscore } = summaryRes.data;
  writeFixture('espn-summary-boxscore.json', stripEspn({ header, boxscore }));
}
writeFixture(
  'espn-injuries.json',
  {
    timestamp: injuries.data?.timestamp,
    season: injuries.data?.season,
    injuries: injTeams.map((t) => ({
      id: t.id,
      abbr: espnTeamAbbr.get(String(t.id)),
      injuries: (t.injuries ?? []).map((i) => ({
        id: i.id, status: i.status, date: i.date, type: i.type?.abbreviation ?? i.type?.name ?? null,
        athlete: { espnId: espnIdFromAthlete(i.athlete) ?? null, displayName: i.athlete?.displayName, position: i.athlete?.position?.abbreviation ?? null },
      })),
    })),
  },
  false,
);
writeFixture('espn-core-injuries-team-shape.json', { count: coreInj.data?.count, pageCount: coreInj.data?.pageCount, firstItem: coreInj.data?.items?.[0] ?? null });

// grep-pattern file (outside the repo) for the leak check
const patternFile = path.join(RAW_DIR, 'secret-patterns.txt');
fs.writeFileSync(patternFile, [...secrets].join('\n') + '\n');
const leaks = written.filter((w) => {
  const body = fs.readFileSync(path.join(FIX_DIR, w.name), 'utf8').toLowerCase();
  return [...secrets].some((s) => body.includes(s.toLowerCase()));
});

// ───────────────────────── summary ─────────────────────────

console.log(`\nCalls: ${calls.length} sequential (gap ≥${GAP_MS} ms). Non-200: ${failed.length ? failed.map((c) => `${c.label}=${c.status || c.error}`).join(', ') : 'none'}`);

hr('[1] Shapes: user → leagues → league → rosters → users → matchups');
console.log(`user keys:      ${Object.keys(user.data).join(', ')}`);
console.log(`not-found user: HTTP ${notFound.status}, body "${notFound.body.slice(0, 40)}"`);
console.log(`leagues ${season}:   ${leagueList.length} (${leagueList.map((l) => `${leagueLetter.get(l.league_id)}=${l.status}/${l.total_rosters}t`).join(', ')}) — chosen ${leagueLetter.get(L)}`);
console.log(`league keys:    ${Object.keys(league.data ?? {}).join(', ')}`);
console.log(`roster_positions: ${(league.data?.roster_positions ?? []).join(' ')}`);
console.log(`playoff_week_start: ${league.data?.settings?.playoff_week_start}  rec=${scoring.rec ?? 0} (PPR=1, half=0.5, std=0)`);
console.log(`roster keys:    ${Object.keys(rosters.data?.[0] ?? {}).join(', ')}`);
console.log(`users keys:     ${Object.keys(lusers.data?.[0] ?? {}).join(', ')}`);
console.log(`matchup keys:   ${Object.keys(matchDone.data?.[0] ?? {}).join(', ')}`);
console.log(`my roster:      found=${yes(myRoster)} via ${myRoster?.owner_id === realUserId ? 'owner_id' : myRoster ? 'co_owners' : '—'}; players=${myRoster?.players?.length ?? 0} starters=${myRoster?.starters?.length ?? 0} reserve(IR)=${myRoster?.reserve?.length ?? 0} taxi=${myRoster?.taxi?.length ?? 0}`);
console.log(`co-owners:      ${(rosters.data ?? []).filter((r) => (r.co_owners ?? []).length).length} of ${(rosters.data ?? []).length} rosters have co_owners (array of user_ids)`);
console.log(`pre_draft:      ${preDraft ? `observed (${preDraft.status}); rosters players: ${(preDraftRosters?.data ?? []).map((r) => (r.players === null ? 'null' : r.players?.length ?? 0)).join(',')}` : 'no pre_draft/drafting league in this account — not observed'}`);

hr('[2] Live points fields');
const m0 = matchDone.data?.[0] ?? {};
console.log(`players_points: ${yes('players_points' in m0)}  starters_points: ${yes('starters_points' in m0)}  custom_points: ${yes('custom_points' in m0)}`);
console.log(`week ${lastDone} (done) total points: ${(matchDone.data ?? []).reduce((a, m) => a + (m.points ?? 0), 0).toFixed(2)}; week ${sleeperWeek} (current) total: ${(matchNow.data ?? []).reduce((a, m) => a + (m.points ?? 0), 0).toFixed(2)}`);
console.log('update cadence: NOT measured here — P0b (live game, Mac mini). Poll default 30 s.');

hr('[3] Rate-limit / cache headers (Sleeper)');
for (const [k, v] of Object.entries(sleeperHdrs)) console.log(`${k}: ${[...v].slice(0, 3).join(' | ')}`);
console.log(`docs.sleeper.com quote: ${docsQuote ? `"${docsQuote}"` : '(sentence not found — check docs manually)'}`);

hr('[4] Weekly stats');
for (const { w, res } of comWeeks) console.log(`api.sleeper.com w${w}: HTTP ${res.status}, ${kb(res.bytes)}, ${Array.isArray(res.data) ? res.data.length : 0} lines, ${res.ms} ms`);
console.log(`api.sleeper.app w${lastDone}: HTTP ${appStats.status}, ${kb(appStats.bytes)}, ${Object.keys(appStats.data ?? {}).length} keys (keyed by player_id; team/opponent: ${yes(Object.values(appStats.data ?? {}).some((s) => s && ('opponent' in s || 'team' in s)))})`);
for (const p of SKILL) console.log(`  ${p.padEnd(3)} lines=${coverage[p].n} team=${coverage[p].team} opponent=${coverage[p].opp}`);
console.log(`K/DEF carry opponent: ${yes(coverage.K.opp === coverage.K.n && coverage.DEF.opp === coverage.DEF.n && coverage.K.n > 0 && coverage.DEF.n > 0)}`);
console.log(`DEF lines include Sleeper's own fan_pts_allow_* : ${[...statKeys].filter((k) => k.startsWith('fan_pts_allow')).join(', ') || 'none'}`);
console.log(`player map: HTTP ${players.status}, ${kb(players.bytes)}, ${Object.keys(pmap).length} players, ${players.ms} ms`);

hr('[5] Scoring keys → stat keys');
console.log(`league scoring keys: ${scoringKeys.length}; present in weekly stat lines (w1..w${lastDone}): ${scoringKeys.length - unmapped.length}`);
console.log(`unmapped (all):      ${unmapped.join(', ') || 'none'}`);
console.log(`unmapped, weight≠0:  ${unmappedNonZero.map((k) => `${k}=${scoring[k]}`).join(', ') || 'none'}`);

hr('[6] ESPN box score fields');
console.log(`event: ${finalEvent ? `${finalEvent.shortName} (w${lastDone})` : 'none final'}`);
console.log(`team stats: ${teamStatNames.join(', ')}`);
console.log(`sacks=${yes(hasStat(/sack/i))} INT=${yes(hasStat(/^interceptions$/i))} fumblesLost=${yes(hasStat(/fumblesLost/i))} turnovers=${yes(hasStat(/turnovers/i))} redZone=${yes(hasStat(/redZone/i))} defensiveTDs=${yes(hasStat(/defensiveTouchdowns/i))}`);
console.log(`player categories: ${playerCats.map((c) => `${c.name}[${c.labels.join('/')}]`).join(' ')}`);
console.log(`TDs by type via player totals: passing=${yes(catHasTd('passing'))} rushing=${yes(catHasTd('rushing'))} receiving=${yes(catHasTd('receiving'))}`);

hr('[7] Season / week');
const constSeason = fs.readFileSync(path.join(ROOT, 'config', 'constants.ts'), 'utf8').match(/SEASON:\s*(\d{4})/)?.[1];
console.log(`ESPN season.year=${espnNow.data?.season?.year}  config/constants.ts SEASON=${constSeason}  Sleeper season=${state.data?.season}`);
console.log(`week today (${new Date().toISOString().slice(0, 10)}): ESPN=${espnWeek}  Sleeper week=${state.data?.week} display_week=${state.data?.display_week}  → ${espnWeek === state.data?.week ? 'AGREE' : 'DISAGREE'}`);

hr('[8] Injuries (ESPN vs Sleeper)');
console.log(`ESPN league-wide /injuries: HTTP ${injuries.status}, ${kb(injuries.bytes)}, ${injCallMs} ms, teams=${injTeams.length}`);
console.log(`ESPN statuses: ${Object.entries(injStatuses).map(([k, v]) => `${k}=${v}`).join(', ')}; unmapped: ${unmappedStatuses.join(', ') || 'none'} (Active = no tag)`);
console.log(`ESPN core per-team: count=${coreInj.data?.count}, items are $ref links only → N+1 calls (rejected)`);
console.log(`rostered (league) players Sleeper marks Q/D/O/IR: ${rosteredInjured.length}; resolved in ESPN feed: ${resolvedById} by espn_id + ${resolvedByName} by name+team = ${(resolveRate * 100).toFixed(1)}%; same status: ${statusAgree}`);

hr('[9] nflverse backup');
console.log(`stats_player 2026 assets: ${assetsFor(nflA).join(', ') || `none (HTTP ${nflA.status})`}`);
console.log(`player_stats 2026 assets: ${assetsFor(nflB).join(', ') || `none (HTTP ${nflB.status})`}`);

hr('DECISIONS (by rule)');
console.log(`Weekly stats source: ${comAllTeamOpp ? 'api.sleeper.com (every QB/RB/WR/TE/K/DEF line has team + opponent)' : 'api.sleeper.app + ESPN schedule (api.sleeper.com lines missing team/opponent)'}`);
console.log(`Injury source:       ${espnClean ? 'ESPN (clean)' : 'Sleeper player map (ESPN not clean)'} — teams=${injTeams.length}/32, ${injCallMs} ms <5000=${yes(injCallMs < 5000)}, unmapped statuses=${unmappedStatuses.length}, resolve ${(resolveRate * 100).toFixed(1)}% ≥95%=${yes(resolveRate >= 0.95)}`);
console.log('Live poll default:   30 s until P0b measures Sleeper cadence');

hr('Fixtures + leak check');
for (const w of written) console.log(`  ${w.name.padEnd(36)} ${kb(w.bytes)}`);
console.log(`secrets tracked: ${secrets.size} (usernames, display/team/league names, ${idMap.size} user ids) → pattern file: ${patternFile}`);
console.log(`self-check leaks in fixtures: ${leaks.length ? leaks.map((l) => l.name).join(', ') : 'none'}`);
console.log('\n[terminal only] real ids replaced (grep each):');
for (const [real, fake] of idMap) console.log(`  ${real} → ${fake}`);

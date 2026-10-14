/**
 * Leans data bundle (server-only) — everything the Leans screens need, shared by
 * all users (no user data at all: the user's prop lines never reach the server).
 *
 * One shared copy per `data.cacheTtlMs` (10 min, same window as Compare stats) in
 * memory (`createKeyedCache`: in-flight dedupe + last good on failure). The pieces
 * underneath keep their own caches — ESPN game log (`getTeamGameLog`), Sleeper week
 * lines (`getWeekLines`, 24h per completed week), the Sleeper player map (24h),
 * the season schedule (6h/week). Never nested inside another `unstable_cache`.
 *
 * Raw per-week values only; the client windows and ranks them (client-side
 * ranking rule). Same completed weeks as My Team's FPA, so tiers agree with the
 * Fantasy tab (but scored as plain Sleeper PPR — Leans has no league).
 */
import 'server-only';
import { createKeyedCache } from '@/lib/apiCache';
import { getTeamGameLog } from '@/lib/espnStats';
import { getPlayerMap } from '@/lib/fantasy';
import { buildFpaTable, type FpaTable } from '@/lib/myteam/fpa';
import { toDefenseLog } from '@/lib/myteam/gameLog';
import { pickTeams, type TeamSchedule } from '@/lib/myteam/schedule';
import { getSeasonSchedule } from '@/lib/myteam/seasonSchedule';
import { getWeekLines } from '@/lib/myteam/sleeper/statLines';
import { getCurrentWeekInfo } from '@/lib/schedule';
import { LEAN_CONFIG } from './config';
import { selectPlayers } from './players';
import type { LeansBundle, LeansPlayer, TeamGame } from './types';

/** Sleeper PPR as a scoring rule: every line already carries `pts_ppr`. */
const PPR_RULES = { pts_ppr: 1 };

type Shared = Omit<LeansBundle, 'players' | 'schedule' | 'generatedAt'> & {
  players: LeansPlayer[];
  schedule: TeamSchedule;
};

const shared = createKeyedCache<Shared>({ ttlMs: LEAN_CONFIG.data.cacheTtlMs, max: 2 });

/** Props only rate skill positions — drop K / DEF cells to keep the payload small. */
function skillOnly(table: FpaTable): FpaTable {
  const out: FpaTable = {};
  for (const [team, byPos] of Object.entries(table)) {
    out[team] = { QB: byPos.QB, RB: byPos.RB, WR: byPos.WR, TE: byPos.TE, K: {}, DEF: {} };
  }
  return out;
}

async function buildShared(): Promise<Shared> {
  const { season, week } = await getCurrentWeekInfo();
  const completedWeeks = Array.from({ length: Math.max(0, week - 1) }, (_, i) => i + 1);
  const [gameLines, weekLines, playerMap, schedule] = await Promise.all([
    getTeamGameLog(),
    Promise.all(completedWeeks.map((w) => getWeekLines(season, w, true))),
    getPlayerMap(),
    getSeasonSchedule(season),
  ]);
  // A missing week would silently skew every rank and hit rate — fail (last good is served).
  const missing = completedWeeks.filter((_, i) => weekLines[i].length === 0);
  if (missing.length > 0) throw new Error(`stat lines missing for week(s) ${missing.join(', ')}`);

  const done = gameLines.filter((l) => l.week <= completedWeeks.length);
  const teamLog: TeamGame[] = done.map((l) => ({ team: l.team, opp: l.opponent, week: l.week, points: l.points, pointsAllowed: l.pointsAllowed }));
  const lines = weekLines.flat();
  return {
    season,
    week,
    completedWeeks,
    teamLog,
    defenseLog: toDefenseLog(done),
    fpa: skillOnly(buildFpaTable(lines, PPR_RULES)),
    players: selectPlayers(lines, playerMap),
    schedule,
  };
}

/** The bundle with only `teams`' players + schedule (team abbreviations, already validated). */
export async function getLeansBundle(teams: readonly string[]): Promise<LeansBundle> {
  const data = await shared.get('shared', buildShared, 'leans:shared');
  const want = new Set(teams);
  return {
    season: data.season,
    week: data.week,
    completedWeeks: data.completedWeeks,
    teamLog: data.teamLog,
    defenseLog: data.defenseLog,
    fpa: data.fpa,
    players: data.players.filter((p) => want.has(p.team)),
    schedule: pickTeams(data.schedule, want),
    generatedAt: new Date().toISOString(),
  };
}

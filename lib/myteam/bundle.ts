/**
 * My Team league bundle — everything the screen needs in one response
 * (server-only). Raw per-week values only; the client windows and ranks them
 * (client-side ranking rule).
 *
 * Caches (all in memory, bounded):
 * - shared (all users): week info + season schedule + ESPN team game logs,
 *   10-min window (same as Compare stats); the pieces underneath keep their
 *   own unstable_cache / per-game caches.
 * - FPA table: 30 min per scoring hash + last completed week (leagues with the
 *   same scoring share it).
 * - league / roster: provider caches (lib/myteam/sleeper/adapter.ts).
 */
import 'server-only';
import { createKeyedCache } from '@/lib/apiCache';
import { getTeamGameLog } from '@/lib/espnStats';
import { getCurrentWeekInfo } from '@/lib/schedule';
import { buildFpaTable, type FpaTable } from './fpa';
import { toDefenseLog, toOffenseLog } from './gameLog';
import type { DefenseGame, OffenseGame } from './defenseProfile';
import { pickTeams, type TeamSchedule } from './schedule';
import { getSeasonSchedule } from './seasonSchedule';
import { sleeperProvider } from './sleeper/adapter';
import { receptionFormat } from './sleeper/scoring';
import { getWeekLines } from './sleeper/statLines';
import type { LeagueBundle } from './apiTypes';
import type { ScoringRules } from './types';

const MIN = 60_000;

interface SharedData {
  season: number;
  week: number;
  completedWeeks: number[];
  schedule: TeamSchedule;
  defenseLog: DefenseGame[];
  offenseLog: OffenseGame[];
}

const shared = createKeyedCache<SharedData>({ ttlMs: 10 * MIN, max: 2 });
const fpaTables = createKeyedCache<FpaTable>({ ttlMs: 30 * MIN, max: 50 });

function getShared(): Promise<SharedData> {
  return shared.get(
    'shared',
    async () => {
      const { season, week } = await getCurrentWeekInfo();
      const completedWeeks = Array.from({ length: Math.max(0, Math.min(18, week - 1)) }, (_, i) => i + 1);
      const [schedule, lines] = await Promise.all([getSeasonSchedule(season), getTeamGameLog()]);
      // Same completed weeks as the FPA chip, so the sheet's "why" stats and the chip agree.
      const done = lines.filter((l) => l.week <= completedWeeks.length);
      return { season, week, completedWeeks, schedule, defenseLog: toDefenseLog(done), offenseLog: toOffenseLog(done) };
    },
    'myteam:shared',
  );
}

function getFpa(season: number, completedWeeks: readonly number[], rules: ScoringRules, hash: string): Promise<FpaTable> {
  const last = completedWeeks[completedWeeks.length - 1] ?? 0;
  return fpaTables.get(
    `${season}|${last}|${hash}`,
    async () => {
      const weeks = await Promise.all(completedWeeks.map((w) => getWeekLines(season, w, true)));
      // A missing week would silently skew every rank — fail instead (last good table is served).
      const missing = completedWeeks.filter((_, i) => weeks[i].length === 0);
      if (missing.length > 0) throw new Error(`stat lines missing for week(s) ${missing.join(', ')}`);
      return buildFpaTable(weeks.flat(), rules);
    },
    'myteam:fpa',
  );
}

export type { LeagueBundle } from './apiTypes';

/** null = the user has no roster in this league. */
export async function buildLeagueBundle(leagueId: string, userId: string): Promise<LeagueBundle | null> {
  const [data, league, roster] = await Promise.all([
    getShared(),
    sleeperProvider.getLeague(leagueId),
    sleeperProvider.getRoster(leagueId, userId),
  ]);
  if (!roster) return null;
  const fpa = await getFpa(data.season, data.completedWeeks, league.scoring, league.scoringHash);
  const teams = new Set(roster.players.map((p) => p.nflTeam).filter((t): t is string => !!t));
  const { scoring, ...leagueInfo } = league;
  return {
    season: data.season,
    week: data.week,
    completedWeeks: data.completedWeeks,
    league: { ...leagueInfo, format: receptionFormat(scoring) },
    roster,
    schedule: pickTeams(data.schedule, teams),
    fpa,
    defenseLog: data.defenseLog,
    offenseLog: data.offenseLog,
    injurySource: 'sleeper',
    generatedAt: new Date().toISOString(),
  };
}

/** Current NFL season (ESPN, single source) — for the leagues lookup. */
export async function currentSeason(): Promise<number> {
  return (await getCurrentWeekInfo()).season;
}

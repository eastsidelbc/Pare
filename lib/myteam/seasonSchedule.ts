/**
 * Whole regular season (weeks 1–18) opponents + byes, from ESPN's scoreboard —
 * server-only, shared by all users. No odds calls (unlike lib/schedule's
 * getMatchupsForWeek). Leaders pattern per week: `unstable_cache` (6h) over a
 * no-store fetch with a timeout, throw on an empty week (never cached), last
 * good per week on top. A week that still fails stays unknown — never a bye
 * (lib/myteam/schedule.ts).
 */
import 'server-only';
import { unstable_cache } from 'next/cache';
import { createTtlCache, liveWithLastGood, type TtlCache } from '@/lib/apiCache';
import { ESPN_SCOREBOARD_URL, mapEspnScoreboard, type EspnScoreboard } from '@/lib/espnScoreboard';
import { NFL_TEAMS } from '@/lib/teams';
import { buildTeamSchedule, type ScheduleGame, type TeamSchedule } from './schedule';

const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);
const TIMEOUT_MS = 5_000;
const BATCH = 6;

async function fetchWeekGames(season: number, week: number): Promise<ScheduleGame[]> {
  const res = await fetch(`${ESPN_SCOREBOARD_URL}?seasontype=2&week=${week}&dates=${season}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ESPN scoreboard HTTP ${res.status}`);
  const games = mapEspnScoreboard((await res.json()) as EspnScoreboard, week).map((m) => ({
    week,
    home: m.home.abbr,
    away: m.away.abbr,
    kickoff: m.kickoff.toISOString(),
    eventId: m.espnEventId,
  }));
  if (games.length === 0) throw new Error(`no games in week ${week}`);
  return games;
}

const cachedWeekGames = unstable_cache(fetchWeekGames, ['myteam-schedule-week-v1'], {
  revalidate: 6 * 60 * 60,
  tags: ['myteam-schedule'],
});

const backups = new Map<number, TtlCache<ScheduleGame[] | null>>();
function backupFor(week: number): TtlCache<ScheduleGame[] | null> {
  let b = backups.get(week);
  if (!b) {
    b = createTtlCache<ScheduleGame[] | null>(0);
    backups.set(week, b);
  }
  return b;
}

/** Every team's opponent (or BYE) for weeks 1–18. Failed weeks are left unknown. */
export async function getSeasonSchedule(season: number): Promise<TeamSchedule> {
  const weeks: Array<{ week: number; games: ScheduleGame[] | null }> = [];
  for (let i = 0; i < WEEKS.length; i += BATCH) {
    const batch = WEEKS.slice(i, i + BATCH);
    const games = await Promise.all(
      batch.map((w) => liveWithLastGood(backupFor(w), () => cachedWeekGames(season, w), () => null, `myteam:schedule:w${w}`)),
    );
    batch.forEach((week, j) => weeks.push({ week, games: games[j] }));
  }
  return buildTeamSchedule(weeks, NFL_TEAMS.map((t) => t.abbr));
}

/**
 * Team schedule (opponents + byes) from per-week game lists — pure.
 *
 * A failed or partial week must never read as a bye: a team is marked BYE
 * only when its week loaded with enough games to be complete. A week with
 * `games: null` (fetch failed) or too few games leaves that team-week unknown
 * (absent), and the UI shows nothing rather than a wrong "BYE".
 */

/** Fewest games in a real regular-season week (6 teams on bye → 13 games). */
export const MIN_GAMES_FOR_BYES = 13;

export interface ScheduleGame {
  week: number;
  home: string;
  away: string;
  /** ISO kickoff time. */
  kickoff: string;
  eventId: string | null;
}

export interface ScheduleEntry {
  opp: string;
  home: boolean;
  kickoff: string;
  eventId: string | null;
}

/** team → week → game or 'BYE'. Unknown team-weeks are absent. */
export type TeamSchedule = Record<string, Record<number, ScheduleEntry | 'BYE'>>;

export function buildTeamSchedule(
  weeks: ReadonlyArray<{ week: number; games: readonly ScheduleGame[] | null }>,
  teams: readonly string[],
): TeamSchedule {
  const out: TeamSchedule = Object.fromEntries(teams.map((t) => [t, {}]));
  for (const { week, games } of weeks) {
    if (!games) continue; // fetch failed → unknown, not a bye
    const playing = new Set<string>();
    for (const g of games) {
      playing.add(g.home);
      playing.add(g.away);
      if (out[g.home]) out[g.home][week] = { opp: g.away, home: true, kickoff: g.kickoff, eventId: g.eventId };
      if (out[g.away]) out[g.away][week] = { opp: g.home, home: false, kickoff: g.kickoff, eventId: g.eventId };
    }
    if (games.length < MIN_GAMES_FOR_BYES) continue; // partial week → can't tell byes
    for (const team of teams) if (!playing.has(team)) out[team][week] = 'BYE';
  }
  return out;
}

/** Keep only the given teams (e.g. a roster's NFL teams) — trims the payload. */
export function pickTeams(schedule: TeamSchedule, teams: Iterable<string>): TeamSchedule {
  const out: TeamSchedule = {};
  for (const t of teams) if (schedule[t]) out[t] = schedule[t];
  return out;
}

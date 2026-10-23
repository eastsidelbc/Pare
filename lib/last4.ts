/**
 * Compare "L4" rows — pure. Each team's last 4 games PLAYED (byes skipped,
 * same window as My Team) summed into rows shaped exactly like the
 * offense/defense routes' rows, with `g` = games in the window. The client's
 * per-game transform (÷ g) then turns them into last-4 averages, so ranking,
 * bars and badges work unchanged.
 *
 * Defense = the OPPONENTS' lines in that team's window, limited to the fields
 * Compare's defense side shows (`availableInDefense` in lib/metricsConfig.ts).
 *
 * Wave B3 fields (2026-10-23) come from the same box scores; red-zone TD %, passer
 * rating and explosive plays have no box-score source and stay "—" in L4.
 */

import type { TeamGameLine } from './espnBoxscore';
import { windowWeeks } from './myteam/rating';
import type { TeamStats } from './types';

interface Totals {
  g: number;
  points: number;
  totalYards: number;
  passYds: number;
  rushYds: number;
  td3Conv: number;
  td3Att: number;
}

function sum(lines: readonly TeamGameLine[], pick: (l: TeamGameLine) => number): number {
  return lines.reduce((s, l) => s + pick(l), 0);
}

function totals(lines: readonly TeamGameLine[]): Totals {
  return {
    g: lines.length,
    points: sum(lines, (l) => l.points),
    totalYards: sum(lines, (l) => l.totalYards),
    passYds: sum(lines, (l) => l.passYds),
    rushYds: sum(lines, (l) => l.rushYds),
    td3Conv: sum(lines, (l) => l.td3Conv),
    td3Att: sum(lines, (l) => l.td3Att),
  };
}

/** Shared fields; third_down_pct is attempts-weighted and left out with no attempts ("—"). */
function baseRow(team: string, t: Totals): TeamStats {
  const row: TeamStats = {
    team,
    g: String(t.g),
    points: String(t.points),
    total_yards: String(t.totalYards),
    pass_yds: String(t.passYds),
    rush_yds: String(t.rushYds),
  };
  if (t.td3Att > 0) row.third_down_pct = String(Math.round((t.td3Conv / t.td3Att) * 1000) / 10);
  return row;
}

const ratio = (a: number, b: number) => (b > 0 ? String(a / b) : undefined);
const pctOf = (a: number, b: number) => (b > 0 ? String(Math.round((a / b) * 1000) / 10) : undefined);

/** Fields computed the same way for a team's own lines (offense) and its opponents' (defense allowed). */
function sharedB3(lines: readonly TeamGameLine[]): Record<string, string | undefined> {
  const yards = sum(lines, (l) => l.totalYards);
  const plays = sum(lines, (l) => l.plays);
  const passAtt = sum(lines, (l) => l.passAtt);
  return {
    first_down: String(sum(lines, (l) => l.firstDowns)),
    pass_fd: String(sum(lines, (l) => l.passFd)),
    rush_fd: String(sum(lines, (l) => l.rushFd)),
    pass_td: String(sum(lines, (l) => l.passTd)),
    rush_td: String(sum(lines, (l) => l.rushTd)),
    yds_per_play_offense: ratio(yards, plays),
    // Net yards per pass attempt counts sacks as attempts (ESPN/NFL "NY/A").
    pass_net_yds_per_att: ratio(sum(lines, (l) => l.passYds), passAtt + sum(lines, (l) => l.sacks)),
    rush_yds_per_att: ratio(sum(lines, (l) => l.rushYds), sum(lines, (l) => l.rushAtt)),
    pass_cmp_pct: pctOf(sum(lines, (l) => l.passCmp), passAtt),
    fourth_down_pct: pctOf(sum(lines, (l) => l.td4Conv), sum(lines, (l) => l.td4Att)),
    time_of_possession: String(sum(lines, (l) => l.topSec) / 60),
  };
}

/** Drop undefined (no denominator → "—"). */
const defined = (o: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(Object.entries(o).filter((e): e is [string, string] => e[1] !== undefined));

export function buildLast4Rows(
  lines: readonly TeamGameLine[],
  teams: ReadonlyArray<{ abbr: string; name: string }>,
): { offense: TeamStats[]; defense: TeamStats[] } {
  const byTeam = new Map<string, TeamGameLine[]>();
  for (const l of lines) {
    const list = byTeam.get(l.team);
    if (list) list.push(l);
    else byTeam.set(l.team, [l]);
  }
  // A team's defense in week W = its opponent's line from that game.
  const byEventTeam = new Map(lines.map((l) => [`${l.eventId}|${l.team}`, l]));

  const offense: TeamStats[] = [];
  const defense: TeamStats[] = [];
  for (const { abbr, name } of teams) {
    const own = byTeam.get(abbr);
    if (!own?.length) continue;
    const weeks = new Set(windowWeeks(own.map((l) => l.week), 'last4'));
    const games = own.filter((l) => weeks.has(l.week));

    const opp = games.flatMap((l) => byEventTeam.get(`${l.eventId}|${l.opponent}`) ?? []);
    const takeaways = sum(opp, (l) => l.turnovers);
    offense.push({
      ...baseRow(name, totals(games)),
      ...defined(sharedB3(games)),
      penalties: String(sum(games, (l) => l.penalties)),
      penalty_yds: String(sum(games, (l) => l.penaltyYds)),
      pen_fd: String(sum(games, (l) => l.penFd)),
      sacks_taken: String(sum(games, (l) => l.sacks)),
      ...(opp.length ? { takeaways: String(takeaways), turnover_diff: String(takeaways - sum(games, (l) => l.turnovers)) } : {}),
      pass_cmp: String(sum(games, (l) => l.passCmp)),
      pass_att: String(sum(games, (l) => l.passAtt)),
      pass_td: String(sum(games, (l) => l.passTd)),
      pass_int: String(sum(games, (l) => l.interceptions)),
      plays_offense: String(sum(games, (l) => l.plays)),
      first_down: String(sum(games, (l) => l.firstDowns)),
      rush_att: String(sum(games, (l) => l.rushAtt)),
      rush_td: String(sum(games, (l) => l.rushTd)),
      fumbles_lost: String(sum(games, (l) => l.fumblesLost)),
      turnovers: String(sum(games, (l) => l.turnovers)),
    });

    if (opp.length) defense.push({ ...baseRow(name, totals(opp)), ...defined(sharedB3(opp)) });
  }
  return { offense, defense };
}

/**
 * Compare "L4" rows — pure. Each team's last 4 games PLAYED (byes skipped,
 * same window as My Team) summed into rows shaped exactly like the
 * offense/defense routes' rows, with `g` = games in the window. The client's
 * per-game transform (÷ g) then turns them into last-4 averages, so ranking,
 * bars and badges work unchanged.
 *
 * Defense = the OPPONENTS' lines in that team's window, limited to the fields
 * Compare's defense side shows (`availableInDefense` in lib/metricsConfig.ts).
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

    offense.push({
      ...baseRow(name, totals(games)),
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

    const opp = games.flatMap((l) => byEventTeam.get(`${l.eventId}|${l.opponent}`) ?? []);
    if (opp.length) defense.push(baseRow(name, totals(opp)));
  }
  return { offense, defense };
}

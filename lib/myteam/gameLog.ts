/**
 * ESPN per-team game lines → the logs the player sheet ranks (pure).
 *
 * A team's DEFENSE allowed what its opponent's offense did, so each line
 * (team T's offense vs O) becomes O's DefenseGame and T's OffenseGame.
 */

import type { TeamGameLine } from '@/lib/espnBoxscore';
import type { DefenseGame, OffenseGame } from './defenseProfile';

export function toDefenseLog(lines: readonly TeamGameLine[]): DefenseGame[] {
  return lines.map((l) => ({
    team: l.opponent,
    week: l.week,
    pass_yds: l.passYds,
    rush_yds: l.rushYds,
    pass_td: l.passTd,
    rush_td: l.rushTd,
    int: l.interceptions,
    sacks: l.sacks,
    points: l.points,
    red_zone_att: l.redZoneAtt,
    drives: l.drives,
  }));
}

export function toOffenseLog(lines: readonly TeamGameLine[]): OffenseGame[] {
  return lines.map((l) => ({
    team: l.team,
    week: l.week,
    turnovers: l.turnovers,
    sacks_allowed: l.sacks,
    points: l.points,
  }));
}

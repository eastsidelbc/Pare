/**
 * Prop-eligible players from the season's weekly stat lines — pure.
 *
 * One entry per QB / RB / WR / TE who has played this season: name + injury from
 * the Sleeper player map, current team (map, else the team of his last game),
 * and his games as the five prop stats — only weeks he actually played (`playedGame`:
 * Sleeper sends a row for every rostered player every week, inactive ones with no
 * `gp` and empty stats; counting those as 0-yard games pulled every hit rate toward
 * the under). Per team, only the top players by
 * season PPR points (config `data.playersPerTeam`) — the picker stays short.
 * A player the map has no name for is left out (never shown as an id).
 */

import { toInjuryTag } from '@/lib/myteam/sleeper/roster';
import type { PlayerGameLine } from '@/lib/myteam/types';
import { normalizeTeamAbbr } from '@/lib/teams';
import { LEAN_CONFIG } from './config';
import type { LeansPlayer, PlayerGame, PropPosition } from './types';

const PROP_POSITIONS: readonly PropPosition[] = ['QB', 'RB', 'WR', 'TE'];
const isPropPosition = (p: string): p is PropPosition => (PROP_POSITIONS as readonly string[]).includes(p);

export interface PlayerInfo {
  name: string;
  team: string;
  injury?: string;
}

const stat = (line: PlayerGameLine, key: string) => line.stats[key] ?? 0;

/**
 * Did he play that week? Sleeper `gp` (games played) — set on every played row, missing on
 * inactive ones (2025: 7,032 played rows, 5,042 without `gp`, 1 of those with any stat). A
 * book voids a prop when the player doesn't play, so the backtest grades only played weeks.
 */
export function playedGame(line: PlayerGameLine): boolean {
  if ((line.stats.gp ?? 0) > 0) return true;
  // The rare row Sleeper left without `gp` but with real numbers.
  return stat(line, 'off_snp') > 0 || stat(line, 'rec_tgt') > 0 || stat(line, 'rush_att') > 0 || stat(line, 'pass_att') > 0;
}

export function toPlayerGame(line: PlayerGameLine): PlayerGame {
  return {
    week: line.week,
    opp: line.opponent,
    rush_yd: stat(line, 'rush_yd'),
    rec: stat(line, 'rec'),
    rec_yd: stat(line, 'rec_yd'),
    rush_td: stat(line, 'rush_td'),
    rec_td: stat(line, 'rec_td'),
  };
}

export function selectPlayers(lines: readonly PlayerGameLine[], info: Readonly<Record<string, PlayerInfo>>): LeansPlayer[] {
  const byId = new Map<string, PlayerGameLine[]>();
  for (const l of lines) {
    if (!isPropPosition(l.position)) continue;
    const list = byId.get(l.playerId) ?? [];
    list.push(l);
    byId.set(l.playerId, list);
  }

  const scored: Array<{ player: LeansPlayer; ppr: number }> = [];
  for (const [id, list] of byId) {
    const p = info[id];
    if (!p?.name) continue;
    const sorted = [...list].sort((a, b) => a.week - b.week);
    const played = sorted.filter(playedGame);
    if (played.length === 0) continue;
    const last = sorted[sorted.length - 1];
    const position = last.position as PropPosition;
    scored.push({
      player: {
        id,
        name: p.name,
        position,
        team: normalizeTeamAbbr(p.team) || last.team,
        injury: toInjuryTag(p.injury),
        games: played.map(toPlayerGame),
      },
      ppr: sorted.reduce((sum, l) => sum + stat(l, 'pts_ppr'), 0),
    });
  }

  const caps = LEAN_CONFIG.data.playersPerTeam;
  const groups = new Map<string, Array<{ player: LeansPlayer; ppr: number }>>();
  for (const s of scored) {
    const key = `${s.player.team}|${s.player.position}`;
    const g = groups.get(key) ?? [];
    g.push(s);
    groups.set(key, g);
  }
  const out: LeansPlayer[] = [];
  for (const g of groups.values()) {
    g.sort((a, b) => b.ppr - a.ppr || a.player.name.localeCompare(b.player.name));
    out.push(...g.slice(0, caps[g[0].player.position]).map((s) => s.player));
  }
  return out.sort((a, b) => a.team.localeCompare(b.team) || PROP_POSITIONS.indexOf(a.position) - PROP_POSITIONS.indexOf(b.position));
}

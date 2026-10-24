/**
 * Week-by-week history — pure (prop research v3, 2026-10-23). Kobe: "history like week 5 and
 * week 6 and going on". Three views read the same rows:
 *
 *   playerWeeks   his games, newest first: the prop stat (over / under tonight's line), targets,
 *                 carries, his share of the team's looks, snap %, aDOT, red-zone looks, YAC
 *   defenseWeeks  tonight's defense, newest first: who it faced, the stat it allowed to his
 *                 position, and what his role's player (WR1, RB1 …) did against it
 *
 * Shares divide by the team's totals that week (`tables.teamWeek`); null when unknown.
 */

import { cellValue, type LineStat } from './propSignals';
import type { PropTables } from './tables';
import type { PlayerGame, PropPosition, Role } from './types';

export interface PlayerWeek {
  week: number;
  opp: string;
  /** The prop stat (null for an anytime-TD view = TDs are shown instead). */
  value: number;
  /** Over tonight's line (null when no line is given). */
  over: boolean | null;
  tgt: number;
  att: number;
  /** His share of team targets (WR / TE) or touches (RB, QB carries). */
  share: number | null;
  snapPct: number | null;
  /** Average depth of target = air yards ÷ targets. */
  adot: number | null;
  /** Red-zone targets + carries. */
  rz: number;
  yac: number;
  td: number;
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

function statOf(g: PlayerGame, stat: LineStat): number {
  switch (stat) {
    case 'rec':
      return g.rec;
    case 'rec_yd':
      return g.rec_yd;
    case 'rush_yd':
      return g.rush_yd;
    case 'rush_rec_yd':
      return g.rush_yd + g.rec_yd;
  }
}

export function playerWeeks(games: readonly PlayerGame[], position: PropPosition, tables: PropTables | null | undefined, stat: LineStat, line: number | null): PlayerWeek[] {
  return [...games]
    .sort((a, b) => b.week - a.week)
    .map((g) => {
      const tw = g.team ? tables?.teamWeek[g.team]?.[g.week] : undefined;
      const tgt = g.tgt ?? 0;
      const att = g.att ?? 0;
      const touches = position === 'RB' || position === 'QB';
      const share = tw ? (touches ? ratio(tgt + att, tw.tgt + tw.rushAtt) : ratio(tgt, tw.tgt)) : null;
      const value = statOf(g, stat);
      return {
        week: g.week,
        opp: g.opp,
        value,
        over: line === null ? null : value > line,
        tgt,
        att,
        share,
        snapPct: typeof g.snp === 'number' && typeof g.tmSnp === 'number' ? ratio(g.snp, g.tmSnp) : null,
        adot: ratio(g.air ?? 0, tgt),
        rz: (g.rzTgt ?? 0) + (g.rzAtt ?? 0),
        yac: g.yac ?? 0,
        td: g.rush_td + g.rec_td,
      };
    });
}

export interface DefenseWeek {
  week: number;
  /** The offense it faced. */
  faced: string;
  /** This stat allowed to his position that week. */
  allowed: number;
  /** His role's player that week (when the role log has one). */
  role: { playerId: string; name: string | null; value: number; over: boolean | null } | null;
}

export function defenseWeeks(tables: PropTables | null | undefined, def: string, position: PropPosition, stat: LineStat, role: Role | null, line: number | null): DefenseWeek[] {
  if (!tables) return [];
  const cells = role ? (tables.roleLog[def]?.[role] ?? []) : [];
  return [...(tables.allowWeeks[def]?.[position] ?? [])]
    .sort((a, b) => b.week - a.week)
    .map((w) => {
      const c = cells.find((x) => x.week === w.week);
      const allowed = stat === 'rec' ? w.rec : stat === 'rec_yd' ? w.recYd : stat === 'rush_yd' ? w.rushYd : w.rushYd + w.recYd;
      const v = c ? cellValue(c, stat) : null;
      return {
        week: w.week,
        faced: w.team,
        allowed,
        role: c && v !== null ? { playerId: c.playerId, name: tables.names?.[c.playerId] ?? null, value: v, over: line === null ? null : v > line } : null,
      };
    });
}

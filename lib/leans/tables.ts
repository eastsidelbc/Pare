/**
 * Prop tables — pure (prop engine v2, A1). Everything the v2 signals read about OTHER
 * players and teams, as of one week: built only from lines of weeks BEFORE `asOfWeek`,
 * so a prop's own game (and anything later) can't leak in. The live app builds it once
 * for the current week (`/api/leans/tables`), the backtest once per week — the same code.
 *
 *   allow    defense → position → what it allowed per game (receptions, targets, yards …)
 *   league   position → the league's per-game average (priors + "factor vs league")
 *   teamWeek team → week → its offense volume (targets, carries, pass attempts)
 *   roleLog  defense → role → the opposing WR1 / RB1 … it faced, newest last (≤ roleLastN)
 *   roles    player → his role going into `asOfWeek` (candidates passed in)
 */

import type { PlayerGameLine } from '@/lib/myteam/types';
import { LEAN_CONFIG } from './config';
import { playedGame } from './players';
import { buildRoleBook, playedCandidates, rolesAsOf, type RoleBook, type RoleCandidate } from './roles';
import type { PropPosition, Role } from './types';

const CFG = LEAN_CONFIG.propV2;
const POSITIONS: readonly PropPosition[] = ['QB', 'RB', 'WR', 'TE'];

/** Totals allowed (or produced) over `games` games. */
export interface VolumeTotals {
  games: number;
  rec: number;
  tgt: number;
  recYd: number;
  rushAtt: number;
  rushYd: number;
}

export interface TeamWeekVolume {
  tgt: number;
  rushAtt: number;
  passAtt: number;
}

export interface RoleCell {
  week: number;
  /** The offense he played for. */
  team: string;
  playerId: string;
  rec: number;
  recYd: number;
  rushYd: number;
}

export interface PropTables {
  asOfWeek: number;
  allow: Record<string, Partial<Record<PropPosition, VolumeTotals>>>;
  league: Partial<Record<PropPosition, VolumeTotals>>;
  teamWeek: Record<string, Record<number, TeamWeekVolume>>;
  roleLog: Record<string, Partial<Record<Role, RoleCell[]>>>;
  roles: Record<string, Role>;
}

const stat = (l: PlayerGameLine, k: string) => l.stats[k] ?? 0;
const emptyTotals = (): VolumeTotals => ({ games: 0, rec: 0, tgt: 0, recYd: 0, rushAtt: 0, rushYd: 0 });
const isPropPosition = (p: string): p is PropPosition => (POSITIONS as readonly string[]).includes(p);

function addLine(t: VolumeTotals, l: PlayerGameLine): void {
  t.rec += stat(l, 'rec');
  t.tgt += stat(l, 'rec_tgt');
  t.recYd += stat(l, 'rec_yd');
  t.rushAtt += stat(l, 'rush_att');
  t.rushYd += stat(l, 'rush_yd');
}

export interface BuildTablesOptions {
  /**
   * Who can hold a role going into `asOfWeek`, per team. Live: the healthy roster.
   * Backtest: who played that week (default when omitted).
   */
  candidates?: (team: string) => readonly RoleCandidate[];
  /** Reuse one season's role book across many weeks (backtest). */
  book?: RoleBook;
}

export function buildPropTables(allLines: readonly PlayerGameLine[], asOfWeek: number, opts: BuildTablesOptions = {}): PropTables {
  const lines = allLines.filter((l) => l.week < asOfWeek && playedGame(l));
  const book = opts.book ?? buildRoleBook(allLines);

  // Defense allowance + league average per position; a game = a week the defense was faced.
  const allow: PropTables['allow'] = {};
  const defWeeks = new Map<string, Set<number>>();
  const league: PropTables['league'] = {};
  for (const l of lines) {
    if (!isPropPosition(l.position)) continue;
    const byPos = (allow[l.opponent] ??= {});
    addLine((byPos[l.position] ??= emptyTotals()), l);
    addLine((league[l.position] ??= emptyTotals()), l);
    const weeks = defWeeks.get(l.opponent) ?? new Set<number>();
    weeks.add(l.week);
    defWeeks.set(l.opponent, weeks);
  }
  let leagueGames = 0;
  for (const [def, byPos] of Object.entries(allow)) {
    const games = defWeeks.get(def)?.size ?? 0;
    leagueGames += games;
    for (const t of Object.values(byPos)) t.games = games;
  }
  for (const t of Object.values(league)) t.games = leagueGames;

  // Offense volume per team-week.
  const teamWeek: PropTables['teamWeek'] = {};
  for (const l of lines) {
    const byWeek = (teamWeek[l.team] ??= {});
    const v = (byWeek[l.week] ??= { tgt: 0, rushAtt: 0, passAtt: 0 });
    v.tgt += stat(l, 'rec_tgt');
    v.rushAtt += stat(l, 'rush_att');
    v.passAtt += stat(l, 'pass_att');
  }

  // The roles each defense faced (role as of that earlier week), newest last.
  const roleLog: PropTables['roleLog'] = {};
  const weekGames = new Map<string, { team: string; opp: string; week: number }>();
  for (const l of lines) weekGames.set(`${l.team}|${l.week}`, { team: l.team, opp: l.opponent, week: l.week });
  const sortedGames = [...weekGames.values()].sort((a, b) => a.week - b.week);
  for (const g of sortedGames) {
    const roles = rolesAsOf(book, g.team, g.week, playedCandidates(book, g.team, g.week));
    for (const [playerId, role] of roles) {
      const l = lines.find((x) => x.playerId === playerId && x.week === g.week);
      if (!l) continue;
      const byRole = (roleLog[g.opp] ??= {});
      (byRole[role] ??= []).push({ week: g.week, team: g.team, playerId, rec: stat(l, 'rec'), recYd: stat(l, 'rec_yd'), rushYd: stat(l, 'rush_yd') });
    }
  }
  for (const byRole of Object.values(roleLog)) {
    for (const role of Object.keys(byRole) as Role[]) byRole[role] = byRole[role]?.slice(-CFG.roleLastN);
  }

  // Roles going into this week.
  const roles: PropTables['roles'] = {};
  for (const team of book.byTeam.keys()) {
    const candidates = opts.candidates ? opts.candidates(team) : playedCandidates(book, team, asOfWeek);
    for (const [id, role] of rolesAsOf(book, team, asOfWeek, candidates)) roles[id] = role;
  }

  return { asOfWeek, allow, league, teamWeek, roleLog, roles };
}

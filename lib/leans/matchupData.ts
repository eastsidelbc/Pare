/**
 * Prop screen "Matchup data" — pure view model (prop engine v2, A6; Kobe 2026-10-23: data
 * rows only, no v2 lean). The numbers behind the v2 signals (lib/leans/propSignals.ts
 * `matchupFacts`) as plain facts, plus the two history rows:
 *
 *   vs the role   this defense's last ≤ 6 games vs tonight's player's role (WR1, RB1 …),
 *                 run against tonight's line
 *   vs defenses like this   his own games vs defenses in the same allowance bucket
 *
 * No projections or P(over) (they didn't beat the market — 2026-10-23 backtest decision).
 */

import { rankAll } from '@/lib/ranking';
import type { MatchupOdds } from '@/lib/schedule';
import { LEAN_CONFIG } from './config';
import { gamesBefore, type EvaluatedProp } from './evaluate';
import { pct, PROP_STAT_SHORT, rankLabel } from './format';
import { lineFor } from './gameLean';
import { defenseWeeks, playerWeeks, type DefenseWeek, type PlayerWeek } from './history';
import { cellValue, matchupFacts, type Bucket, type LineStat } from './propSignals';
import type { PropTables, TeamWeekVolume, VolumeTotals } from './tables';
import type { LeansBundle, PlayerGame, PropPosition, PropStat, Role } from './types';

/** One fact row (the why-stats box recipe): label, value, rank ("#29" / "—"). */
export interface DataRow {
  label: string;
  value: string;
  rank: string;
}

export interface MockCell {
  week: number;
  /** Role row: the offense that player was on. Similar row: the defense he faced. */
  team: string;
  value: number;
  over: boolean;
}

export interface MockRow {
  /** `**bold**` allowed. */
  text: string;
  cells: MockCell[];
}

export interface MatchupData {
  rows: DataRow[];
  /**
   * Receiving props (receptions, rec yds): what this defense allowed per game to each role
   * (WR1 / WR2 / WR3 / TE1 / RB1), last ≤ 6 games — his role marked. Empty for rushing props.
   */
  roles: DataRow[];
  /** Week by week (newest first): his games, and tonight's defense (prop research v3). */
  his: PlayerWeek[];
  defense: DefenseWeek[];
  /** His role going in (WR1, RB1 …), null = none. */
  role: Role | null;
  vsRole: MockRow | null;
  vsSimilar: MockRow | null;
}

const isLineStat = (s: PropStat): s is LineStat => s !== 'anytime_td';
const first = (name: string) => name.split(/\s+/)[0] ?? name;
const one = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const SHARE_WORD: Readonly<Record<LineStat, string>> = {
  rec: 'targets',
  rec_yd: 'targets',
  rush_yd: 'carries',
  rush_rec_yd: 'touches',
};

const EFF_TEXT: Readonly<Record<LineStat, { label: string; fmt: (r: number) => string }>> = {
  rec: { label: 'catch rate', fmt: pct },
  rec_yd: { label: 'yds / target', fmt: one },
  rush_yd: { label: 'yds / carry', fmt: one },
  rush_rec_yd: { label: 'yds / touch', fmt: one },
};

const BUCKET_TEXT: Readonly<Record<Bucket, string>> = {
  stingy: 'the stingiest',
  mid: 'middle-of-the-pack',
  generous: 'the most generous',
};

const ROLE_PLURAL = (r: Role) => `${r}s`;
const RECEIVING_ROLES: readonly Role[] = ['WR1', 'WR2', 'WR3', 'TE1', 'RB1'];

/** Defense rank on `value` among defenses with enough games: #1 = allows the least. */
function defRank(tables: PropTables, position: PropPosition, opp: string, value: (t: VolumeTotals) => number | null): { value: number; rank: number } | null {
  const entries: Array<readonly [string, number]> = [];
  for (const [def, byPos] of Object.entries(tables.allow)) {
    const t = byPos[position];
    if (!t || t.games < LEAN_CONFIG.propV2.minTeamGames) continue;
    const v = value(t);
    if (v !== null) entries.push([def, v]);
  }
  const r = rankAll(entries, false).get(opp);
  const v = entries.find(([d]) => d === opp)?.[1];
  return r && v !== undefined ? { value: v, rank: r.rank } : null;
}

const sum = (games: readonly PlayerGame[], f: (g: PlayerGame) => number) => games.reduce((acc, g) => acc + f(g), 0);
const per = (a: number, b: number) => (b > 0 ? a / b : null);

/**
 * Depth + efficiency rows (prop research v3, Kobe's picks: air yards + aDOT, red-zone looks,
 * efficiency): his season numbers and what tonight's defense allows to his position.
 */
function depthRows(games: readonly PlayerGame[], tables: PropTables, opp: string, position: PropPosition, team: string, name: string, rushing: boolean): DataRow[] {
  const rows: DataRow[] = [];
  const tgt = sum(games, (g) => g.tgt ?? 0);
  const att = sum(games, (g) => g.att ?? 0);
  const rec = sum(games, (g) => g.rec);
  const teamSum = (f: (t: TeamWeekVolume) => number) =>
    games.reduce((acc, g) => {
      const t = g.team ? tables.teamWeek[g.team]?.[g.week] : undefined;
      return acc + (t ? f(t) : 0);
    }, 0);
  const push = (label: string, v: number | null, fmt: (n: number) => string, rank = '—') => {
    if (v !== null && Number.isFinite(v)) rows.push({ label, value: fmt(v), rank });
  };
  const defRow = (label: string, value: (t: VolumeTotals) => number | null, fmt: (n: number) => string) => {
    const r = defRank(tables, position, opp, value);
    if (r) rows.push({ label: `${opp} allows ${label} to ${position}s`, value: fmt(r.value), rank: rankLabel(r.rank) });
  };
  if (!rushing) {
    push(`${name}'s aDOT (air yds / target)`, per(sum(games, (g) => g.air ?? 0), tgt), one);
    push(`${name}'s share of ${team} air yards`, per(sum(games, (g) => g.air ?? 0), teamSum((t) => t.air)), pct);
    push(`${name}'s catch rate · drops`, per(rec, tgt), (v) => `${pct(v)} · ${sum(games, (g) => g.drop ?? 0)}`);
    push(`${name}'s yds after catch / catch`, per(sum(games, (g) => g.yac ?? 0), rec), one);
    push(`${name}'s 1st downs / target`, per(sum(games, (g) => g.recFd ?? 0), tgt), (v) => v.toFixed(2));
    push(`${name}'s red-zone targets · share`, per(sum(games, (g) => g.rzTgt ?? 0), teamSum((t) => t.rzTgt)), (v) => `${sum(games, (g) => g.rzTgt ?? 0)} · ${pct(v)}`);
    defRow('aDOT', (t) => per(t.air, t.tgt), one);
    defRow('yds after catch / catch', (t) => per(t.yac, t.rec), one);
  } else {
    push(`${name}'s red-zone carries · share`, per(sum(games, (g) => g.rzAtt ?? 0), teamSum((t) => t.rzAtt)), (v) => `${sum(games, (g) => g.rzAtt ?? 0)} · ${pct(v)}`);
    push(`${name}'s yds after contact / carry`, per(sum(games, (g) => g.rushYac ?? 0), att), one);
    push(`${name}'s broken tackles · 1st downs / carry`, per(sum(games, (g) => g.rushFd ?? 0), att), (v) => `${sum(games, (g) => g.btkl ?? 0)} · ${v.toFixed(2)}`);
  }
  defRow('red-zone looks / game', (t) => per(t.rzTgt + t.rzAtt, t.games), one);
  return rows;
}

/**
 * The tables as a past week's prop saw them: weekly history (team volume, allowance by week,
 * role games) cut to weeks BEFORE the prop's week. The current week's tables pass through.
 * Season allowance totals + roles stay as of the bundle's week (no weekly split to cut them).
 */
export function tablesBefore(tables: PropTables, week: number): PropTables {
  if (week >= tables.asOfWeek) return tables;
  const cutWeeks = <T extends { week: number }>(xs: readonly T[] | undefined) => (xs ?? []).filter((x) => x.week < week);
  return {
    ...tables,
    teamWeek: Object.fromEntries(Object.entries(tables.teamWeek).map(([t, byWeek]) => [t, Object.fromEntries(Object.entries(byWeek).filter(([w]) => Number(w) < week))])),
    allowWeeks: Object.fromEntries(Object.entries(tables.allowWeeks).map(([d, byPos]) => [d, Object.fromEntries(Object.entries(byPos).map(([p, xs]) => [p, cutWeeks(xs)]))])),
    roleLog: Object.fromEntries(Object.entries(tables.roleLog).map(([d, byRole]) => [d, Object.fromEntries(Object.entries(byRole).map(([r, xs]) => [r, cutWeeks(xs)]))])),
  };
}

/** Null when the bundle has no v2 tables yet, the player isn't in it, or it's an anytime-TD prop. */
export function propMatchupData(e: EvaluatedProp, bundle: LeansBundle | null, odds: MatchupOdds | null): MatchupData | null {
  const { prop, player } = e;
  const tables = bundle?.tables ? tablesBefore(bundle.tables, prop.week) : undefined;
  if (!bundle || !tables || !player || !isLineStat(prop.stat)) return null;
  const stat = prop.stat;
  const games = gamesBefore(player, prop.week);
  if (games.length === 0) return null;
  const [away, home] = prop.home ? [prop.opp, prop.team] : [prop.team, prop.opp];
  const teamLine = odds ? lineFor(prop.home ? 'home' : 'away', away, home, odds.spreadLine ?? null) : null;
  const f = matchupFacts({
    playerId: prop.playerId,
    position: prop.position,
    team: prop.team,
    opp: prop.opp,
    stat,
    line: prop.line,
    games,
    tables,
    teamLog: bundle.teamLog,
    teamLine,
    total: odds?.overUnder ?? null,
    rating: e.rating,
  });

  const word = PROP_STAT_SHORT[stat];
  const name = first(prop.playerName);
  const rows: DataRow[] = [];
  if (f.allow) rows.push({ label: `${prop.opp} allows ${word} / game to ${prop.position}s`, value: one(f.allow.perGame), rank: rankLabel(f.allow.rank) });
  if (f.eff) rows.push({ label: `${prop.opp} allows ${EFF_TEXT[stat].label} to ${prop.position}s`, value: EFF_TEXT[stat].fmt(f.eff.rate), rank: rankLabel(f.eff.rank) });
  if (f.share) {
    const recent = f.share.recent === null ? '' : ` → ${pct(f.share.recent)}`;
    rows.push({ label: `${name}'s share of ${prop.team} ${SHARE_WORD[stat]}, season → last ${LEAN_CONFIG.propV2.recentGames}`, value: `${pct(f.share.season)}${recent}`, rank: '—' });
  }
  if (f.snaps) {
    const recent = f.snaps.recent === null ? '' : ` → ${pct(f.snaps.recent)}`;
    rows.push({ label: `${name}'s snaps, season → last ${LEAN_CONFIG.propV2.recentGames}`, value: `${pct(f.snaps.season)}${recent}`, rank: '—' });
  }
  if (f.median !== null) rows.push({ label: `${name}'s median ${word} this season`, value: one(f.median), rank: '—' });
  if (f.implied) {
    const ppg = f.implied.ppg === null ? '' : ` · scores **${one(f.implied.ppg)}** / game`;
    rows.push({ label: `${prop.team} points the line implies${ppg}`, value: one(f.implied.points), rank: '—' });
  }
  if (f.passRate) rows.push({ label: `${prop.team} pass rate`, value: pct(f.passRate.rate), rank: rankLabel(f.passRate.rank) });
  rows.push(...depthRows(games, tables, prop.opp, prop.position, prop.team, name, stat === 'rush_yd' || stat === 'rush_rec_yd'));

  const vsRole: MockRow | null = f.role
    ? {
        text: `vs ${ROLE_PLURAL(f.role.role)}, last ${f.role.cells.length}: ${prop.opp} allowed **${one(f.role.avg)}** ${word} · over ${prop.line} in **${f.role.overs} of ${f.role.cells.length}**`,
        cells: f.role.cells.map((c) => ({ week: c.week, team: c.team, value: c.value, over: c.over })),
      }
    : null;
  const vsSimilar: MockRow | null =
    f.similar && f.allow
      ? {
          text: `vs ${BUCKET_TEXT[f.similar.bucket]} D's at ${prop.position} ${word} (${prop.opp} is ${rankLabel(f.allow.rank)}): over ${prop.line} in **${f.similar.overs} of ${f.similar.games.length}**`,
          cells: f.similar.games.map((g) => ({ week: g.week, team: g.opp, value: g.value, over: g.over })),
        }
      : null;
  const mine = tables.roles[prop.playerId];
  const roles: DataRow[] =
    stat === 'rec' || stat === 'rec_yd'
      ? RECEIVING_ROLES.flatMap((role) => {
          const cells = tables.roleLog[prop.opp]?.[role] ?? [];
          if (cells.length < LEAN_CONFIG.propV2.roleMinCells) return [];
          const avg = cells.reduce((sum, c) => sum + cellValue(c, stat), 0) / cells.length;
          return [{ label: `vs ${ROLE_PLURAL(role)}, last ${cells.length}${role === mine ? ` · **${name}'s role**` : ''}`, value: one(avg), rank: '—' }];
        })
      : [];
  const his = playerWeeks(games, prop.position, tables, stat, prop.line);
  const defense = defenseWeeks(tables, prop.opp, prop.position, stat, mine ?? null, prop.line);
  return { rows, roles, his, defense, role: mine ?? null, vsRole, vsSimilar };
}

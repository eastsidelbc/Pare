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

import type { MatchupOdds } from '@/lib/schedule';
import { LEAN_CONFIG } from './config';
import { gamesBefore, type EvaluatedProp } from './evaluate';
import { pct, PROP_STAT_SHORT, rankLabel } from './format';
import { lineFor } from './gameLean';
import { cellValue, matchupFacts, type Bucket, type LineStat } from './propSignals';
import type { LeansBundle, PropStat, Role } from './types';

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

/** Null when the bundle has no v2 tables yet, the player isn't in it, or it's an anytime-TD prop. */
export function propMatchupData(e: EvaluatedProp, bundle: LeansBundle | null, odds: MatchupOdds | null): MatchupData | null {
  const { prop, player } = e;
  const tables = bundle?.tables;
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
  return { rows, roles, vsRole, vsSimilar };
}

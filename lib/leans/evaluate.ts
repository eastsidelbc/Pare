/**
 * Bundle → per-screen lean inputs (pure). Everything is cut to games BEFORE the
 * week being looked at, so a past week reads the way it did before kickoff —
 * hit rates, game logs AND the matchup tier.
 */

import { whyStats, type WhyStat } from '@/lib/myteam/defenseProfile';
import type { FpaTable } from '@/lib/myteam/fpa';
import { rankFpa, rateMatchup, type MatchupRating } from '@/lib/myteam/rating';
import type { RatingWindow } from '@/lib/myteam/types';
import { LEAN_CONFIG } from './config';
import { gameLeans, leagueForm, type GameLeans, type LeagueForm } from './gameLean';
import { propLean, type PropLeanResult } from './propLean';
import type { LeansBundle, LeansPlayer, PropPosition, SavedProp } from './types';
import type { Matchup } from '@/lib/schedule';
import { PROP_STAT_SHORT, rankLabel, signed } from './format';

/** The FPA table with only weeks before `week`. */
export function fpaBefore(table: FpaTable, week: number): FpaTable {
  const out: FpaTable = {};
  for (const [team, byPos] of Object.entries(table)) {
    const cut = Object.fromEntries(
      Object.entries(byPos).map(([pos, weeks]) => [pos, Object.fromEntries(Object.entries(weeks).filter(([w]) => Number(w) < week))]),
    ) as FpaTable[string];
    out[team] = cut;
  }
  return out;
}

/** Opponent's rating for a position, before `week` (null = no games yet / unknown team) + how many teams were ranked. */
export function ratingFor(
  bundle: Pick<LeansBundle, 'fpa'>,
  position: PropPosition,
  opp: string,
  week: number,
  window: RatingWindow,
): { rating: MatchupRating | null; of: number } {
  const ranks = rankFpa(fpaBefore(bundle.fpa, week), position, window);
  return { rating: rateMatchup(ranks, opp), of: ranks.size };
}

/** Opponent why-stats (rush / pass yds allowed …) for a position, before `week`. */
export function whyFor(bundle: Pick<LeansBundle, 'defenseLog'>, position: PropPosition, opp: string, week: number, window: RatingWindow): WhyStat[] {
  return whyStats(position, opp, bundle.defenseLog.filter((g) => g.week < week), [], window);
}

export function gamesBefore(player: LeansPlayer, week: number) {
  return player.games.filter((g) => g.week < week);
}

export interface EvaluatedProp {
  prop: SavedProp;
  player: LeansPlayer | null;
  rating: MatchupRating | null;
  /** Teams in the rating's ranking (for "allows the 3rd-most"). */
  ratingOf: number;
  lean: PropLeanResult | null;
}

export function evaluateProp(prop: SavedProp, bundle: LeansBundle | null): EvaluatedProp {
  const player = bundle?.players.find((p) => p.id === prop.playerId) ?? null;
  if (!bundle || !player) return { prop, player, rating: null, ratingOf: 0, lean: null };
  const { rating, of } = ratingFor(bundle, prop.position, prop.opp, prop.week, LEAN_CONFIG.prop.tierWindow);
  const lean = propLean({
    games: gamesBefore(player, prop.week),
    stat: prop.stat,
    line: prop.line,
    side: prop.side,
    position: prop.position,
    rating,
  });
  return { prop, player, rating, ratingOf: of, lean };
}

/** Lean form for one week (shared by every card in that week). */
export function leagueFormFor(bundle: Pick<LeansBundle, 'teamLog'>, week: number): LeagueForm {
  return leagueForm(bundle.teamLog, week);
}

export function leansForGame(bundle: Pick<LeansBundle, 'teamLog'>, m: Matchup, league?: LeagueForm): GameLeans {
  return gameLeans(
    bundle.teamLog,
    {
      awayTeam: m.away.abbr,
      homeTeam: m.home.abbr,
      week: m.week,
      total: m.odds?.overUnder ?? null,
      spreadLine: m.odds?.spreadLine ?? null,
      hasSpread: !!m.odds,
      hasMoneyline: !!m.odds?.moneyline,
    },
    league ?? leagueForm(bundle.teamLog, m.week),
  );
}

// ── Prop "why" rows + game-line cells (pure helpers for the views) ──────

export interface WhyRow {
  /** `**bold**` marks the number. */
  label: string;
  /** "#29" / "T-14" / "—". */
  rank: string;
}

const WHY_UNIT: Readonly<Record<string, string>> = {
  rush_yds: 'rush yds / game',
  pass_yds: 'pass yds / game',
  rush_td: 'rush TDs / game',
  pass_td: 'pass TDs / game',
};

/** Which opponent stats explain a prop (by stat, not position — a QB's rush line reads the run D). */
function whyKeys(prop: SavedProp): Array<{ profile: 'RB' | 'WR'; key: string }> {
  switch (prop.stat) {
    case 'rush_yd':
      return [{ profile: 'RB', key: 'rush_yds' }];
    case 'rec_yd':
    case 'rec':
      return [{ profile: 'WR', key: 'pass_yds' }];
    case 'rush_rec_yd':
      return [
        { profile: 'RB', key: 'rush_yds' },
        { profile: 'WR', key: 'pass_yds' },
      ];
    case 'anytime_td':
      return [prop.position === 'WR' || prop.position === 'TE' ? { profile: 'WR', key: 'pass_td' } : { profile: 'RB', key: 'rush_td' }];
  }
}

const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

/** "LV allows **132.1** rush yds / game  #29" rows + "Bijan averages **96.0** rush yds, last 4  —". */
export function propWhy(e: EvaluatedProp, bundle: Pick<LeansBundle, 'defenseLog'> | null): WhyRow[] {
  const { prop } = e;
  const rows: WhyRow[] = [];
  if (bundle) {
    for (const { profile, key } of whyKeys(prop)) {
      const stat = whyFor(bundle, profile, prop.opp, prop.week, LEAN_CONFIG.prop.tierWindow).find((s) => s.key === key);
      if (!stat || !Number.isFinite(stat.value)) continue;
      rows.push({
        label: `${prop.opp} allows **${stat.value.toFixed(1)}** ${WHY_UNIT[key]}`,
        rank: Number.isFinite(stat.rank) ? rankLabel(stat.rank, stat.isTied) : '—',
      });
    }
  }
  const last = e.lean?.hits.slice(-LEAN_CONFIG.lastN) ?? [];
  if (last.length > 0) {
    const name = firstName(prop.playerName);
    if (prop.stat === 'anytime_td') {
      rows.push({ label: `${name} scored in **${last.filter((h) => h.value > 0).length} of last ${last.length}**`, rank: '—' });
    } else {
      const avg = last.reduce((s, h) => s + h.value, 0) / last.length;
      rows.push({ label: `${name} averages **${avg.toFixed(1)}** ${PROP_STAT_SHORT[prop.stat]}, last ${last.length}`, rank: '—' });
    }
  }
  return rows;
}

export interface LineCell {
  week: number;
  /** "38" for totals, "+7" / "−3" for margins. */
  text: string;
  /** On the side the checks were read for (✓). */
  ok: boolean;
}

/** One team's last-N point margins vs a line it gets (`teamLine`, e.g. −1.5); ok = would have covered / won. */
export function marginCells(league: LeagueForm, team: string, teamLine: number | null): LineCell[] {
  const form = league.forms.get(team);
  return (form?.last ?? []).map((g) => {
    const m = g.points - g.pointsAllowed;
    return { week: g.week, text: signed(m, 0), ok: teamLine == null ? m > 0 : m + teamLine > 0 };
  });
}

/**
 * Prop lean — pure (Leans DECISIONS §6). Three signals, all must agree:
 *
 *   OVER   over the line in ≥3 of the last 4 · ≥60% of this season's games ·
 *          matchup tier Good / Great for the player's position
 *   UNDER  the mirror: ≤1 of 4 · ≤40% · Tough / Avoid
 *
 * Fewer than 4 games → 'not-enough'. Otherwise neither side complete → 'none',
 * and the three checks shown are the user's own side (so "Why no lean" reads
 * against what they typed). Only games BEFORE the prop's week count — the
 * caller passes them in. Thresholds: lib/leans/config.ts.
 */

import type { MatchupRating } from '@/lib/myteam/rating';
import { LEAN_CONFIG } from './config';
import { num, pct, rankLabel } from './format';
import type { LeanResult, LeanSignal, PlayerGame, PropPosition, PropSide, PropStat } from './types';

const CFG = LEAN_CONFIG.prop;

/** The number a prop is settled on, for one game. Anytime TD = touchdowns scored. */
export function statValue(game: PlayerGame, stat: PropStat): number {
  switch (stat) {
    case 'rush_yd':
      return game.rush_yd;
    case 'rec_yd':
      return game.rec_yd;
    case 'rec':
      return game.rec;
    case 'rush_rec_yd':
      return game.rush_yd + game.rec_yd;
    case 'anytime_td':
      return game.rush_td + game.rec_td;
  }
}

/** The line a stat is judged against (anytime TD has no typed line). */
export function effectiveLine(stat: PropStat, line: number): number {
  return stat === 'anytime_td' ? CFG.anytimeTdLine : line;
}

export interface PropHit {
  week: number;
  value: number;
  /** Strictly over the line (a push is not over). */
  over: boolean;
}

/** Every game's value vs the line, ascending by week. */
export function propHits(games: readonly PlayerGame[], stat: PropStat, line: number): PropHit[] {
  const l = effectiveLine(stat, line);
  return [...games]
    .sort((a, b) => a.week - b.week)
    .map((g) => {
      const value = statValue(g, stat);
      return { week: g.week, value, over: value > l };
    });
}

export interface PropLeanInput {
  /** The player's games before the prop's week. */
  games: readonly PlayerGame[];
  stat: PropStat;
  line: number;
  /** The side the user typed. */
  side: PropSide;
  position: PropPosition;
  /** This week's opponent rating for the position (Season window); null = no rating. */
  rating: MatchupRating | null;
}

export interface PropLeanResult extends LeanResult {
  hits: PropHit[];
  last: { over: number; games: number };
  season: { over: number; games: number };
}

function overWord(stat: PropStat, side: PropSide): string {
  if (stat === 'anytime_td') return side === 'over' ? 'with a TD' : 'without a TD';
  return side;
}

function signalsFor(dir: PropSide, input: PropLeanInput, last: PropLeanResult['last'], season: PropLeanResult['season']): LeanSignal[] {
  const l = effectiveLine(input.stat, input.line);
  const lastCount = dir === 'over' ? last.over : last.games - last.over;
  const seasonCount = dir === 'over' ? season.over : season.games - season.over;
  const share = season.games > 0 ? season.over / season.games : 0;
  const lineText = input.stat === 'anytime_td' ? '' : ` ${num(l)}`;
  const word = overWord(input.stat, dir);
  // Mockup copy: "4 of 6 this season (67%)" for an over; the other cases say which way.
  const seasonWord = dir === 'over' && input.stat !== 'anytime_td' ? '' : ` ${word}`;

  const lastOk = dir === 'over' ? last.over >= CFG.lastOverMin : last.over <= CFG.lastOverMaxForUnder;
  const seasonOk = dir === 'over' ? share >= CFG.seasonOverMin : share <= CFG.seasonOverMaxForUnder;
  const tiers = dir === 'over' ? CFG.overTiers : CFG.underTiers;
  const tierOk = input.rating ? tiers.includes(input.rating.tier) : false;
  const seasonShare = season.games > 0 ? seasonCount / season.games : 0;

  return [
    { ok: lastOk && last.games >= LEAN_CONFIG.lastN, label: `**${lastCount} of last ${last.games}** games ${word}${lineText}` },
    { ok: seasonOk && season.games > 0, label: `**${seasonCount} of ${season.games}**${seasonWord} this season (${pct(seasonShare)})` },
    {
      ok: tierOk,
      label: input.rating
        ? `Matchup **${input.rating.label} ${rankLabel(input.rating.rank, input.rating.isTied)}** for ${input.position}s`
        : `No matchup rating for ${input.position}s yet`,
    },
  ];
}

export function propLean(input: PropLeanInput): PropLeanResult {
  const hits = propHits(input.games, input.stat, input.line);
  const lastHits = hits.slice(-LEAN_CONFIG.lastN);
  const last = { over: lastHits.filter((h) => h.over).length, games: lastHits.length };
  const season = { over: hits.filter((h) => h.over).length, games: hits.length };
  const base = { hits, last, season };

  const over = signalsFor('over', input, last, season);
  const under = signalsFor('under', input, last, season);
  const count = (s: LeanSignal[]) => s.filter((x) => x.ok).length;
  const all = (s: LeanSignal[]) => s.every((x) => x.ok);

  if (hits.length < LEAN_CONFIG.minGames) {
    const signals = input.side === 'over' ? over : under;
    return {
      ...base,
      verdict: 'not-enough',
      signals,
      okCount: count(signals),
      summary: `Only **${hits.length}** game${hits.length === 1 ? '' : 's'} played — Pare needs ${LEAN_CONFIG.minGames}`,
      short: 'Not enough games yet',
    };
  }
  if (all(over)) return { ...base, verdict: 'over', signals: over, okCount: count(over), summary: 'All three signals point OVER', short: 'Data leans OVER' };
  if (all(under)) return { ...base, verdict: 'under', signals: under, okCount: count(under), summary: 'All three signals point UNDER', short: 'Data leans UNDER' };

  const signals = input.side === 'over' ? over : under;
  return {
    ...base,
    verdict: 'none',
    signals,
    okCount: count(signals),
    summary: 'Pare only shows a lean when all three signals point the same way. Here they don’t, so it stays quiet.',
    short: 'No lean',
  };
}

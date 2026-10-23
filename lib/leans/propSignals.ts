/**
 * Prop signals — pure (prop engine v2, A2). Each signal is ONE number `x` for one prop:
 * positive favors the over, negative the under, 0 neutral, null = not enough data (it
 * sits out). The checklist rule votes with them (|x| ≥ its threshold) and the logistic
 * rule weighs them, so both read exactly the same numbers. Everything comes from games
 * BEFORE the prop's week: the player's own `games` and `tables` (built as of the week).
 *
 * Universal: l4Hits · seasonHit · medianEdge · projEdge · usageTrend · snapTrend ·
 *            impliedTotal · spreadScript · fpaTier
 * Opponent, stat-specific: oppAllow (this stat allowed per game to his position) ·
 *            oppEff (catch % / yds per target / yds per carry allowed) ·
 *            defVsRole (what it allowed to his role — WR1, RB1 … — last N) ·
 *            similarDef (his own games vs defenses in the same bucket)
 * His team:  passRate (pass-heavy offense → receiving overs, run-heavy → rushing).
 */

import { countOverProb, normalOverProb } from '@/lib/formulas/player';
import { mean, percentile, shrink } from '@/lib/formulas/stats';
import type { MatchupRating } from '@/lib/myteam/rating';
import { rankAll } from '@/lib/ranking';
import { LEAN_CONFIG } from './config';
import { statValue } from './propLean';
import type { PropTables, RoleCell, VolumeTotals } from './tables';
import type { PlayerGame, PropPosition, PropStat, Role, TeamGame } from './types';

const CFG = LEAN_CONFIG.propV2;
const HALF = CFG.half;
/** The 50th percentile (percentile() takes 0–100). */
const MEDIAN = 100 * HALF;

export type LineStat = Exclude<PropStat, 'anytime_td'>;

export const SIGNAL_IDS = [
  'l4Hits',
  'seasonHit',
  'medianEdge',
  'projEdge',
  'usageTrend',
  'snapTrend',
  'impliedTotal',
  'oppAllow',
  'oppEff',
  'defVsRole',
  'similarDef',
  'passRate',
  'spreadScript',
  'fpaTier',
] as const;
export type SignalId = (typeof SIGNAL_IDS)[number];

export type Bucket = 'stingy' | 'mid' | 'generous';

export interface PropContext {
  playerId: string;
  position: PropPosition;
  /** His team this week. */
  team: string;
  opp: string;
  stat: LineStat;
  line: number;
  /** His played games before the prop's week, ascending. */
  games: readonly PlayerGame[];
  tables: PropTables;
  /** Every team's score lines (only weeks before `tables.asOfWeek` are read). */
  teamLog: readonly TeamGame[];
  /** His team's spread (−3 = favored by 3) and the game total; null = no line. */
  teamLine: number | null;
  total: number | null;
  /** Today's PPR points-allowed tier for his position (the v1 matchup signal). */
  rating: MatchupRating | null;
}

export interface SignalValue {
  id: SignalId;
  x: number | null;
}

// ── small helpers ───────────────────────────────────────────────────────

const isRush = (stat: LineStat) => stat === 'rush_yd' || stat === 'rush_rec_yd';

/** The stat a defense allowed, per its totals. */
function allowedStat(t: VolumeTotals, stat: LineStat): number {
  switch (stat) {
    case 'rec':
      return t.rec;
    case 'rec_yd':
      return t.recYd;
    case 'rush_yd':
      return t.rushYd;
    case 'rush_rec_yd':
      return t.rushYd + t.recYd;
  }
}

/** Efficiency allowed: catch % (rec) · yds / target (rec yds) · yds / carry (rush) · yds / touch. */
function allowedRate(t: VolumeTotals, stat: LineStat): number | null {
  const [num, den] =
    stat === 'rec' ? [t.rec, t.tgt] : stat === 'rec_yd' ? [t.recYd, t.tgt] : stat === 'rush_yd' ? [t.rushYd, t.rushAtt] : [t.rushYd + t.recYd, t.rushAtt + t.tgt];
  return den > 0 ? num / den : null;
}

export function cellValue(c: RoleCell, stat: LineStat): number {
  return stat === 'rec' ? c.rec : stat === 'rec_yd' ? c.recYd : stat === 'rush_yd' ? c.rushYd : c.rushYd + c.recYd;
}

/** Rank → −1 … +1, where +1 = rank `n` (the far end) and −1 = rank 1. */
function rankScale(rank: number, n: number): number | null {
  const range = (n - 1) * HALF;
  return range > 0 ? (rank - (n + 1) * HALF) / range : null;
}

const overShare = (values: readonly number[], line: number) => (values.length === 0 ? null : values.filter((v) => v > line).length / values.length);

// Ranks are the same for every prop of a week — computed once per tables object.
const rankMemo = new WeakMap<PropTables, Map<string, Map<string, { rank: number; n: number }>>>();

/** Every defense with enough games, ranked on `value`: #1 = allows the LEAST (rating.ts convention). */
function defenseRanks(tables: PropTables, key: string, value: (t: VolumeTotals) => number | null, position: PropPosition) {
  let byKey = rankMemo.get(tables);
  if (!byKey) {
    byKey = new Map();
    rankMemo.set(tables, byKey);
  }
  const memoKey = `${position}|${key}`;
  let ranks = byKey.get(memoKey);
  if (!ranks) {
    const entries: Array<readonly [string, number]> = [];
    for (const [def, byPos] of Object.entries(tables.allow)) {
      const t = byPos[position];
      if (!t || t.games < CFG.minTeamGames) continue;
      const v = value(t);
      if (v !== null) entries.push([def, v]);
    }
    const ranked = rankAll(entries, false);
    ranks = new Map([...ranked].map(([def, r]) => [def, { rank: r.rank, n: entries.length }]));
    byKey.set(memoKey, ranks);
  }
  return ranks;
}

const perGame = (stat: LineStat) => (t: VolumeTotals) => (t.games > 0 ? allowedStat(t, stat) / t.games : null);

/** Tonight's opponent's allowance rank for this stat + position (#1 = allows the least). */
export function oppAllowRank(ctx: Pick<PropContext, 'tables' | 'position' | 'stat' | 'opp'>): { rank: number; n: number } | null {
  return defenseRanks(ctx.tables, `allow:${ctx.stat}`, perGame(ctx.stat), ctx.position).get(ctx.opp) ?? null;
}

export function bucketOf(rank: number): Bucket {
  if (rank <= CFG.bucket.stingyMaxRank) return 'stingy';
  if (rank >= CFG.bucket.generousMinRank) return 'generous';
  return 'mid';
}

/** His share of his team's volume in his games: targets (receiving), carries (rush), touches (both). */
function shares(ctx: PropContext, games: readonly PlayerGame[]): number | null {
  let own = 0;
  let team = 0;
  for (const g of games) {
    const tw = ctx.tables.teamWeek[g.team ?? ctx.team]?.[g.week];
    if (!tw || g.tgt === undefined || g.att === undefined) continue;
    if (ctx.stat === 'rush_yd') {
      own += g.att;
      team += tw.rushAtt;
    } else if (ctx.stat === 'rush_rec_yd') {
      own += g.att + g.tgt;
      team += tw.rushAtt + tw.tgt;
    } else {
      own += g.tgt;
      team += tw.tgt;
    }
  }
  return team > 0 ? own / team : null;
}

function snapPctOf(games: readonly PlayerGame[]): number | null {
  const withSnaps = games.filter((g) => typeof g.snp === 'number' && typeof g.tmSnp === 'number' && g.tmSnp > 0);
  if (withSnaps.length === 0) return null;
  const own = withSnaps.reduce((s, g) => s + (g.snp ?? 0), 0);
  const team = withSnaps.reduce((s, g) => s + (g.tmSnp ?? 0), 0);
  return own / team;
}

/** Team volume per game (targets, carries, pass attempts) over weeks before the prop, shrunk to the league. */
function teamVolume(tables: PropTables, team: string): { games: number; tgt: number; rushAtt: number; passAtt: number } | null {
  const all = Object.values(tables.teamWeek).flatMap((byWeek) => Object.values(byWeek));
  const own = Object.values(tables.teamWeek[team] ?? {});
  if (own.length < CFG.minTeamGames || all.length === 0) return null;
  const avg = (xs: readonly { tgt: number; rushAtt: number; passAtt: number }[], k: 'tgt' | 'rushAtt' | 'passAtt') => mean(xs.map((x) => x[k])) ?? 0;
  const sh = (k: 'tgt' | 'rushAtt' | 'passAtt') => shrink(own.length, avg(own, k), avg(all, k), CFG.volumeShrinkGames) ?? avg(all, k);
  return { games: own.length, tgt: sh('tgt'), rushAtt: sh('rushAtt'), passAtt: sh('passAtt') };
}

/** A defense's rate allowed ÷ the league's, shrunk toward 1 by its games. */
function oppFactor(ctx: PropContext, rate: (t: VolumeTotals) => number | null): number {
  const lg = ctx.tables.league[ctx.position];
  const def = ctx.tables.allow[ctx.opp]?.[ctx.position];
  const lgRate = lg ? rate(lg) : null;
  const defRate = def ? rate(def) : null;
  if (!def || lgRate === null || defRate === null || lgRate === 0) return 1;
  return shrink(def.games, defRate / lgRate, 1, CFG.rateShrinkGames) ?? 1;
}

/** His rate (num ÷ den over his games), shrunk toward his position's league rate. */
function playerRate(ctx: PropContext, num: (g: PlayerGame) => number, den: (g: PlayerGame) => number, league: (t: VolumeTotals) => number | null): number | null {
  const lg = ctx.tables.league[ctx.position];
  const prior = lg ? league(lg) : null;
  const d = ctx.games.reduce((s, g) => s + den(g), 0);
  if (prior === null) return null;
  if (d === 0) return prior;
  return shrink(ctx.games.length, ctx.games.reduce((s, g) => s + num(g), 0) / d, prior, CFG.rateShrinkGames);
}

export interface Projection {
  /** Projected mean of the stat (receptions = Poisson rate). */
  mean: number;
  pOver: number;
}

/** Opportunity × efficiency × opponent factor → P(over). Null without volume data. */
export function projectProp(ctx: PropContext): Projection | null {
  const vol = teamVolume(ctx.tables, ctx.team);
  if (!vol || ctx.games.length === 0) return null;
  const recent = ctx.games.slice(-CFG.recentGames);
  const blend = (s: number | null, r: number | null) => (s === null ? null : CFG.seasonShareWeight * s + (1 - CFG.seasonShareWeight) * (r ?? s));
  const share = (stat: LineStat) => {
    const c = { ...ctx, stat };
    return blend(shares(c, ctx.games), shares(c, recent));
  };

  const tgtShare = share('rec');
  const carryShare = share('rush_yd');
  const expTgt = tgtShare === null ? null : vol.tgt * tgtShare;
  const expAtt = carryShare === null ? null : vol.rushAtt * carryShare;

  const catchRate = playerRate(ctx, (g) => g.rec, (g) => g.tgt ?? 0, (t) => (t.tgt > 0 ? t.rec / t.tgt : null));
  const ypt = playerRate(ctx, (g) => g.rec_yd, (g) => g.tgt ?? 0, (t) => (t.tgt > 0 ? t.recYd / t.tgt : null));
  const ypc = playerRate(ctx, (g) => g.rush_yd, (g) => g.att ?? 0, (t) => (t.rushAtt > 0 ? t.rushYd / t.rushAtt : null));
  const recMean = expTgt !== null && catchRate !== null ? expTgt * catchRate * oppFactor(ctx, (t) => allowedRate(t, 'rec')) : null;
  const recYdMean = expTgt !== null && ypt !== null ? expTgt * ypt * oppFactor(ctx, (t) => allowedRate(t, 'rec_yd')) : null;
  const rushMean = expAtt !== null && ypc !== null ? expAtt * ypc * oppFactor(ctx, (t) => allowedRate(t, 'rush_yd')) : null;

  const normal = (mu: number | null, cv: number) => (mu === null || mu <= 0 ? null : { mean: mu, pOver: normalOverProb(ctx.line, mu, cv * mu) });
  let out: { mean: number; pOver: number | null } | null;
  switch (ctx.stat) {
    case 'rec':
      out = recMean === null ? null : { mean: recMean, pOver: countOverProb(ctx.line, recMean) };
      break;
    case 'rec_yd':
      out = normal(recYdMean, CFG.cv.rec_yd);
      break;
    case 'rush_yd':
      out = normal(rushMean, CFG.cv.rush_yd);
      break;
    case 'rush_rec_yd':
      out = normal(rushMean === null && recYdMean === null ? null : (rushMean ?? 0) + (recYdMean ?? 0), CFG.cv.rush_rec_yd);
      break;
  }
  return out && out.pOver !== null ? { mean: out.mean, pOver: out.pOver } : null;
}

/** His team's points per game before the week, shrunk to the league. */
function teamPpg(teamLog: readonly TeamGame[], team: string, week: number): number | null {
  const before = teamLog.filter((g) => g.week < week);
  const own = before.filter((g) => g.team === team);
  const league = mean(before.map((g) => g.points));
  const m = mean(own.map((g) => g.points));
  if (league === null || m === null) return null;
  return shrink(own.length, m, league);
}

// ── mocks (the two history rows on the prop screen) ─────────────────────

export interface DefenseVsRoleMock {
  role: Role;
  cells: Array<{ week: number; team: string; playerId: string; value: number; over: boolean }>;
  avg: number;
  overs: number;
}

/** This defense's last N games vs tonight's player's role, run against tonight's line. */
export function defenseVsRoleMock(ctx: Pick<PropContext, 'tables' | 'playerId' | 'opp' | 'stat' | 'line'>): DefenseVsRoleMock | null {
  const role = ctx.tables.roles[ctx.playerId];
  if (!role) return null;
  const cells = (ctx.tables.roleLog[ctx.opp]?.[role] ?? []).map((c) => {
    const value = cellValue(c, ctx.stat);
    return { week: c.week, team: c.team, playerId: c.playerId, value, over: value > ctx.line };
  });
  if (cells.length < CFG.roleMinCells) return null;
  return { role, cells, avg: mean(cells.map((c) => c.value)) ?? 0, overs: cells.filter((c) => c.over).length };
}

export interface SimilarDefenseMock {
  bucket: Bucket;
  games: Array<{ week: number; opp: string; value: number; over: boolean }>;
  overs: number;
}

/** His own games vs defenses in tonight's opponent's bucket (ranks as of this week), against tonight's line. */
export function similarDefenseMock(ctx: Pick<PropContext, 'tables' | 'position' | 'stat' | 'opp' | 'line' | 'games'>): SimilarDefenseMock | null {
  const ranks = defenseRanks(ctx.tables, `allow:${ctx.stat}`, perGame(ctx.stat), ctx.position);
  const tonight = ranks.get(ctx.opp);
  if (!tonight) return null;
  const bucket = bucketOf(tonight.rank);
  const games = ctx.games
    .filter((g) => {
      const r = ranks.get(g.opp);
      return r !== undefined && bucketOf(r.rank) === bucket;
    })
    .map((g) => {
      const value = statValue(g, ctx.stat);
      return { week: g.week, opp: g.opp, value, over: value > ctx.line };
    });
  if (games.length < CFG.similarMinGames) return null;
  return { bucket, games, overs: games.filter((g) => g.over).length };
}

// ── matchup facts (the numbers behind the signals, for the prop screen's data rows) ──

export interface RankOf {
  rank: number;
  n: number;
}

export interface MatchupFacts {
  /** His median of this stat this season. */
  median: number | null;
  /** His share of his team's targets / carries / touches: season and last `recentGames`. */
  share: { season: number; recent: number | null } | null;
  /** His snap share: season and last `recentGames`. */
  snaps: { season: number; recent: number | null } | null;
  /** Implied team points from the line (total / 2 − spread / 2) vs his team's shrunk points per game. */
  implied: { points: number; ppg: number | null } | null;
  /** Tonight's defense: this stat allowed per game to his position (#1 = allows the least). */
  allow: (RankOf & { perGame: number }) | null;
  /** …and its efficiency allowed (catch %, yds / target, yds / carry, yds / touch). */
  eff: (RankOf & { rate: number }) | null;
  /** His team's pass rate (#1 = most pass-heavy). */
  passRate: (RankOf & { rate: number }) | null;
  role: DefenseVsRoleMock | null;
  similar: SimilarDefenseMock | null;
}

export function matchupFacts(ctx: PropContext): MatchupFacts {
  const values = ctx.games.map((g) => statValue(g, ctx.stat));
  const recent = ctx.games.slice(-CFG.recentGames);
  const shareSeason = shares(ctx, ctx.games);
  const snapSeason = snapPctOf(ctx.games);
  const ppg = teamPpg(ctx.teamLog, ctx.team, ctx.tables.asOfWeek);
  const def = ctx.tables.allow[ctx.opp]?.[ctx.position];

  const allowRank = oppAllowRank(ctx);
  const effRank = defenseRanks(ctx.tables, `eff:${ctx.stat}`, (t) => allowedRate(t, ctx.stat), ctx.position).get(ctx.opp) ?? null;
  const effRate = def ? allowedRate(def, ctx.stat) : null;

  // Team pass rate among teams with enough games: #1 = most pass-heavy.
  const passEntries: Array<readonly [string, number]> = [];
  for (const [team, byWeek] of Object.entries(ctx.tables.teamWeek)) {
    const weeks = Object.values(byWeek);
    const plays = weeks.reduce((sum, w) => sum + w.passAtt + w.rushAtt, 0);
    if (weeks.length >= CFG.minTeamGames && plays > 0) passEntries.push([team, weeks.reduce((sum, w) => sum + w.passAtt, 0) / plays]);
  }
  const passRank = rankAll(passEntries, true).get(ctx.team);
  const passRate = passEntries.find(([t]) => t === ctx.team)?.[1];

  return {
    median: percentile(values, MEDIAN),
    share: shareSeason === null ? null : { season: shareSeason, recent: shares(ctx, recent) },
    snaps: snapSeason === null ? null : { season: snapSeason, recent: snapPctOf(recent) },
    implied: ctx.total !== null && ctx.teamLine !== null ? { points: ctx.total * HALF - ctx.teamLine * HALF, ppg } : null,
    allow: allowRank && def && def.games > 0 ? { ...allowRank, perGame: allowedStat(def, ctx.stat) / def.games } : null,
    eff: effRank && effRate !== null ? { ...effRank, rate: effRate } : null,
    passRate: passRank && passRate !== undefined ? { rank: passRank.rank, n: passEntries.length, rate: passRate } : null,
    role: defenseVsRoleMock(ctx),
    similar: similarDefenseMock(ctx),
  };
}

// ── the signals ─────────────────────────────────────────────────────────

export function computeSignals(ctx: PropContext): SignalValue[] {
  const values = ctx.games.map((g) => statValue(g, ctx.stat));
  const last = values.slice(-LEAN_CONFIG.lastN);
  const rush = isRush(ctx.stat);
  const f = matchupFacts(ctx);

  const l4Hits = last.length >= LEAN_CONFIG.lastN ? last.filter((v) => v > ctx.line).length - LEAN_CONFIG.lastN * HALF : null;
  const season = overShare(values, ctx.line);
  const proj = projectProp(ctx);
  // Rank #1 = allows the least → the far end (+1) = allows the most = over.
  const scaled = (r: RankOf | null) => (r ? rankScale(r.rank, r.n) : null);
  const passScaled = scaled(f.passRate);

  const x: Record<SignalId, number | null> = {
    l4Hits,
    seasonHit: season === null ? null : season - HALF,
    medianEdge: f.median === null || ctx.line <= 0 ? null : (f.median - ctx.line) / ctx.line,
    projEdge: proj ? proj.pOver - HALF : null,
    usageTrend: f.share && f.share.season && f.share.recent !== null ? (f.share.recent - f.share.season) / f.share.season : null,
    snapTrend: f.snaps && f.snaps.recent !== null ? f.snaps.recent - f.snaps.season : null,
    impliedTotal: f.implied && f.implied.ppg !== null ? f.implied.points - f.implied.ppg : null,
    oppAllow: scaled(f.allow),
    oppEff: scaled(f.eff),
    defVsRole: f.role ? f.role.overs / f.role.cells.length - HALF : null,
    similarDef: f.similar ? f.similar.overs / f.similar.games.length - HALF : null,
    // Rank #1 = most pass-heavy → −(scale): pass-heavy = + for receiving, flipped for rushing.
    passRate: passScaled === null ? null : rush ? passScaled : -passScaled,
    // −3 = favored: rushing likes a lead (+3), receiving likes chasing (−3 → getting points = +).
    spreadScript: ctx.teamLine === null ? null : rush ? -ctx.teamLine : ctx.teamLine,
    fpaTier: ctx.rating ? rankScale(ctx.rating.rank, CFG.teams) : null,
  };
  return SIGNAL_IDS.map((id) => ({ id, x: x[id] }));
}

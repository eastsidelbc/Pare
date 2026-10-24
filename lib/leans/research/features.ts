/**
 * Prop research v3 — the feature library (pure). Kobe 2026-10-23: "figure out the millions of
 * possible ways possible and test them". Every number here is one measurable thing about a
 * prop, built only from games BEFORE its week (the same `PropContext` the v2 signals use); the
 * search (./search.ts) combines them into rules. A feature is null when its data is missing.
 *
 * Families (≈ 60 features):
 *   form      his stat vs tonight's line over last 1 / 2 / 3 / 5 / 8 / all games (mean, hit share),
 *             median, min / max of last 3, volatility, trend
 *   usage     target / touch share and snap % (season, last 3, trend), volume per game
 *   depth     aDOT, air-yards share, red-zone looks + share
 *   effic.    catch rate, yds / target, yds / carry, YAC / catch, 1st downs / opportunity, drops
 *   opponent  allowance + efficiency ranks (season and last 3), aDOT / YAC / red-zone allowed,
 *             volume allowed, his role's last-N vs the line, similar defenses, PPR tier
 *   game      implied team points (level + vs his team's scoring), total, spread, home, pass rate,
 *             team volume ranks, the opponent's scoring
 *   v2        the 14 prop engine v2 signals, as-is
 */

import { mean, percentile, stdev } from '@/lib/formulas/stats';
import { rankAll } from '@/lib/ranking';
import { statValue } from '../propLean';
import { cellValue, computeSignals, matchupFacts, projectProp, type PropContext } from '../propSignals';
import type { AllowWeek, VolumeTotals } from '../tables';
import type { PlayerGame } from '../types';

export type FeatureMap = Record<string, number | null>;

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const sumOf = (gs: readonly PlayerGame[], f: (g: PlayerGame) => number) => gs.reduce((s, g) => s + f(g), 0);
const rel = (v: number | null, line: number) => (v === null || line <= 0 ? null : (v - line) / line);

/** Rank of `key` among `entries` scaled to −1 (rank 1 = highest value) … +1 (lowest); null if absent. */
function scaledRank(entries: Array<readonly [string, number]>, key: string): number | null {
  if (entries.length < 2) return null;
  const r = rankAll(entries, true).get(key);
  if (!r) return null;
  return (r.rank - (entries.length + 1) / 2) / ((entries.length - 1) / 2);
}

/** Defense entries on a per-game value from season totals (defenses with ≥ 2 games). */
function defEntries(ctx: PropContext, value: (t: VolumeTotals) => number | null): Array<readonly [string, number]> {
  const out: Array<readonly [string, number]> = [];
  for (const [def, byPos] of Object.entries(ctx.tables.allow)) {
    const t = byPos[ctx.position];
    if (!t || t.games < 2) continue;
    const v = value(t);
    if (v !== null && Number.isFinite(v)) out.push([def, v]);
  }
  return out;
}

const allowStat = (stat: PropContext['stat'], t: Omit<VolumeTotals, 'games'>) =>
  stat === 'rec' ? t.rec : stat === 'rec_yd' ? t.recYd : stat === 'rush_yd' ? t.rushYd : t.rushYd + t.recYd;

/** Last-3 allowance per game for every defense (from the weekly rows). */
function defLast3(ctx: PropContext): Array<readonly [string, number]> {
  const out: Array<readonly [string, number]> = [];
  for (const [def, byPos] of Object.entries(ctx.tables.allowWeeks)) {
    const weeks: readonly AllowWeek[] = byPos[ctx.position] ?? [];
    const last = weeks.slice(-3);
    if (last.length < 2) continue;
    out.push([def, last.reduce((s, w) => s + allowStat(ctx.stat, w), 0) / last.length]);
  }
  return out;
}

const rushing = (ctx: PropContext) => ctx.stat === 'rush_yd' || ctx.stat === 'rush_rec_yd';
const oppOf = (ctx: PropContext, g: PlayerGame) => (ctx.stat === 'rush_yd' ? (g.att ?? 0) : ctx.stat === 'rush_rec_yd' ? (g.att ?? 0) + (g.tgt ?? 0) : (g.tgt ?? 0));

function shareOf(ctx: PropContext, games: readonly PlayerGame[], own: (g: PlayerGame) => number, team: (t: { tgt: number; rushAtt: number; air: number; rzTgt: number; rzAtt: number }) => number): number | null {
  let a = 0;
  let b = 0;
  for (const g of games) {
    const tw = ctx.tables.teamWeek[g.team ?? ctx.team]?.[g.week];
    if (!tw) continue;
    a += own(g);
    b += team(tw);
  }
  return ratio(a, b);
}

function snapPct(games: readonly PlayerGame[]): number | null {
  const ok = games.filter((g) => typeof g.snp === 'number' && typeof g.tmSnp === 'number' && g.tmSnp > 0);
  return ok.length ? ratio(sumOf(ok, (g) => g.snp ?? 0), sumOf(ok, (g) => g.tmSnp ?? 0)) : null;
}

/** All research features for one prop. `home` = his team is the home side. */
export function researchFeatures(ctx: PropContext, home: boolean | null): FeatureMap {
  const L = ctx.line;
  const g = ctx.games;
  const v = g.map((x) => statValue(x, ctx.stat));
  const last = (n: number) => v.slice(-n);
  const f: FeatureMap = {};

  // form
  for (const n of [1, 2, 3, 5, 8]) f[`form_mean${n}`] = v.length >= n ? rel(mean(last(n)), L) : null;
  f.form_meanAll = rel(mean(v), L);
  for (const n of [3, 5, 8]) f[`form_hit${n}`] = v.length >= n ? last(n).filter((x) => x > L).length / n : null;
  f.form_hitAll = v.length ? v.filter((x) => x > L).length / v.length : null;
  f.form_median = rel(percentile(v, 50), L);
  f.form_max3 = v.length >= 3 ? rel(Math.max(...last(3)), L) : null;
  f.form_min3 = v.length >= 3 ? rel(Math.min(...last(3)), L) : null;
  const sd = stdev(v);
  f.form_vol = sd === null || L <= 0 ? null : sd / L;
  const m3 = mean(last(3));
  const mAll = mean(v);
  f.form_trend = m3 === null || mAll === null || L <= 0 ? null : (m3 - mAll) / L;
  f.form_games = g.length;
  f.line = L;

  // usage
  const recent = g.slice(-3);
  const looks = (x: PlayerGame) => oppOf(ctx, x);
  const teamLooks = (t: { tgt: number; rushAtt: number }) => (ctx.stat === 'rush_yd' ? t.rushAtt : ctx.stat === 'rush_rec_yd' ? t.rushAtt + t.tgt : t.tgt);
  const shAll = shareOf(ctx, g, looks, teamLooks);
  const sh3 = shareOf(ctx, recent, looks, teamLooks);
  f.use_share = shAll;
  f.use_share3 = sh3;
  f.use_shareTrend = shAll === null || sh3 === null ? null : sh3 - shAll;
  const snAll = snapPct(g);
  const sn3 = snapPct(recent);
  f.use_snap = snAll;
  f.use_snap3 = sn3;
  f.use_snapTrend = snAll === null || sn3 === null ? null : sn3 - snAll;
  f.use_volPg = g.length ? sumOf(g, looks) / g.length : null;
  f.use_vol3 = recent.length ? sumOf(recent, looks) / recent.length : null;

  // depth
  const tgt = sumOf(g, (x) => x.tgt ?? 0);
  const att = sumOf(g, (x) => x.att ?? 0);
  const rec = sumOf(g, (x) => x.rec);
  f.depth_adot = ratio(sumOf(g, (x) => x.air ?? 0), tgt);
  f.depth_airShare = shareOf(ctx, g, (x) => x.air ?? 0, (t) => t.air);
  f.depth_rzShare = shareOf(ctx, g, (x) => (x.rzTgt ?? 0) + (x.rzAtt ?? 0), (t) => t.rzTgt + t.rzAtt);
  f.depth_rzPg = g.length ? sumOf(g, (x) => (x.rzTgt ?? 0) + (x.rzAtt ?? 0)) / g.length : null;

  // efficiency
  f.eff_catch = ratio(rec, tgt);
  f.eff_ypt = ratio(sumOf(g, (x) => x.rec_yd), tgt);
  f.eff_ypc = ratio(sumOf(g, (x) => x.rush_yd), att);
  f.eff_yacPerRec = ratio(sumOf(g, (x) => x.yac ?? 0), rec);
  f.eff_fdPerOpp = ratio(sumOf(g, (x) => (x.recFd ?? 0) + (x.rushFd ?? 0)), tgt + att);
  f.eff_dropRate = ratio(sumOf(g, (x) => x.drop ?? 0), tgt);
  f.eff_yacoPerCarry = ratio(sumOf(g, (x) => x.rushYac ?? 0), att);

  // projection
  const proj = projectProp(ctx);
  f.proj_meanVsLine = proj ? rel(proj.mean, L) : null;

  // opponent
  const opp = ctx.opp;
  f.opp_allow = scaledRank(defEntries(ctx, (t) => ratio(allowStat(ctx.stat, t), t.games)), opp);
  f.opp_allowL3 = scaledRank(defLast3(ctx), opp);
  f.opp_volAllowed = scaledRank(defEntries(ctx, (t) => ratio(rushing(ctx) ? t.rushAtt : t.tgt, t.games)), opp);
  f.opp_adotAllowed = scaledRank(defEntries(ctx, (t) => ratio(t.air, t.tgt)), opp);
  f.opp_yacAllowed = scaledRank(defEntries(ctx, (t) => ratio(t.yac, t.rec)), opp);
  f.opp_rzAllowed = scaledRank(defEntries(ctx, (t) => ratio(t.rzTgt + t.rzAtt, t.games)), opp);
  f.opp_catchAllowed = scaledRank(defEntries(ctx, (t) => ratio(t.rec, t.tgt)), opp);
  f.opp_yptAllowed = scaledRank(defEntries(ctx, (t) => ratio(t.recYd, t.tgt)), opp);
  f.opp_ypcAllowed = scaledRank(defEntries(ctx, (t) => ratio(t.rushYd, t.rushAtt)), opp);
  const role = ctx.tables.roles[ctx.playerId];
  const cells = role ? (ctx.tables.roleLog[opp]?.[role] ?? []) : [];
  const cv = cells.map((c) => cellValue(c, ctx.stat));
  f.opp_roleMeanVsLine = cv.length >= 3 ? rel(mean(cv), L) : null;
  f.opp_roleHit = cv.length >= 3 ? cv.filter((x) => x > L).length / cv.length : null;
  f.opp_roleHit3 = cv.length >= 3 ? cv.slice(-3).filter((x) => x > L).length / 3 : null;

  // game
  const facts = matchupFacts(ctx);
  f.game_implied = facts.implied ? facts.implied.points : null;
  f.game_impliedVsPpg = facts.implied && facts.implied.ppg !== null ? facts.implied.points - facts.implied.ppg : null;
  f.game_total = ctx.total;
  f.game_teamLine = ctx.teamLine;
  f.game_home = home === null ? null : home ? 1 : 0;
  const teamEntries = (fn: (w: { tgt: number; rushAtt: number; passAtt: number }) => number) =>
    Object.entries(ctx.tables.teamWeek).flatMap(([t, byWeek]) => {
      const ws = Object.values(byWeek);
      return ws.length >= 2 ? [[t, ws.reduce((s, w) => s + fn(w), 0) / ws.length] as const] : [];
    });
  f.game_teamTgtRank = scaledRank(teamEntries((w) => w.tgt), ctx.team);
  f.game_teamRushRank = scaledRank(teamEntries((w) => w.rushAtt), ctx.team);
  f.game_teamPlaysRank = scaledRank(teamEntries((w) => w.passAtt + w.rushAtt), ctx.team);
  const before = ctx.teamLog.filter((x) => x.week < ctx.tables.asOfWeek);
  const oppPts = before.filter((x) => x.team === opp).map((x) => x.points);
  const oppAllowed = before.filter((x) => x.team === opp).map((x) => x.pointsAllowed);
  f.game_oppPpg = mean(oppPts);
  f.game_oppAllowedPpg = mean(oppAllowed);

  // v2 signals as-is
  for (const s of computeSignals(ctx)) f[`v2_${s.id}`] = s.x;
  return f;
}

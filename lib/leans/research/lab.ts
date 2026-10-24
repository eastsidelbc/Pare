/**
 * Leans lab — the weekly champion-vs-challengers loop (pure; pre-registration
 * docs/plans/2026-10-23-leans-lab/preregistration.md). Kobe 2026-10-23: "each week, take the weeks that
 * happened, learn, test formulas, and if one looks like it works add it next week".
 *
 *   champion     what the app shows today (the v1 3-check rule)
 *   challengers  rules frozen BEFORE a week's games (search finalists), graded in shadow mode on every prop
 *   each week    grade the finished week for everyone frozen before it → learn on all data so far →
 *                freeze up to `newPerWeek` new challengers for next week
 *   promotion    a challenger is only FLAGGED ("ready") after it beats the bar on forward weeks; it goes
 *                live only when Kobe approves (never automatic)
 *
 * The ledger is plain JSON (scripts/leans-lab.ts keeps it in .cache/leans-lab/, outside git).
 */

import { normCdf } from '@/lib/formulas/stats';
import type { FeatureRow } from '../backtestV2';
import { overlap, ruleFires, ruleText, type Rule, type Scored } from './search';

export const LAB = {
  /** −110 break-even (the 2026 feed is unpriced). */
  breakeven: 110 / 210,
  /** Promotion bar on forward (post-freeze) bets. */
  promoteMinBets: 60,
  promoteMaxP: 0.05,
  /** New challengers frozen per week, and the most kept active. */
  newPerWeek: 3,
  maxActive: 20,
  /** Retire a challenger once it has this many forward bets and is losing. */
  retireMinBets: 60,
  /** A new rule whose bets overlap an active one's more than this (Jaccard) is a copy — skipped. */
  maxOverlap: 0.7,
} as const;

export interface WeekResult {
  week: number;
  wins: number;
  losses: number;
}

export interface LedgerEntry {
  id: string;
  kind: 'champion' | 'challenger';
  /** Null for the champion (v1 lives in the app's engine). */
  rule: Rule | null;
  /** First week it is graded on (frozen before that week's games). */
  firstWeek: number;
  /** Where it came from ("v1 engine", "search after W7", "research v3 finalist"). */
  source: string;
  retired?: { week: number; reason: string };
  results: WeekResult[];
}

export interface Ledger {
  season: number;
  /** Last week graded. */
  gradedThrough: number;
  /** Last week whose data the search has learned from (new challengers start the week after). */
  learnedThrough: number;
  entries: LedgerEntry[];
}

export function newLedger(season: number, firstWeek: number, seed: ReadonlyArray<{ rule: Rule; source: string }>): Ledger {
  return {
    season,
    gradedThrough: firstWeek - 1,
    learnedThrough: firstWeek - 1,
    entries: [
      { id: 'champion-v1', kind: 'champion', rule: null, firstWeek, source: 'v1 engine (3 signals, all agree)', results: [] },
      ...seed.map((s, i) => ({ id: `c${i + 1}`, kind: 'challenger' as const, rule: s.rule, firstWeek, source: s.source, results: [] })),
    ],
  };
}

const sideOf = (e: LedgerEntry, r: FeatureRow): 'over' | 'under' | null => (e.rule ? (ruleFires(e.rule, r) ? e.rule.side : null) : r.v1);

/** Grade one finished week for every active entry frozen before it (pushes skipped). */
export function gradeWeek(ledger: Ledger, rows: readonly FeatureRow[], week: number): Ledger {
  const weekRows = rows.filter((r) => r.week === week && r.actual !== r.line);
  const entries = ledger.entries.map((e) => {
    if (e.retired || e.firstWeek > week || e.results.some((x) => x.week === week)) return e;
    let wins = 0;
    let losses = 0;
    for (const r of weekRows) {
      const side = sideOf(e, r);
      if (!side) continue;
      if (side === 'over' ? r.actual > r.line : r.actual < r.line) wins++;
      else losses++;
    }
    return { ...e, results: [...e.results, { week, wins, losses }] };
  });
  return { ...ledger, gradedThrough: Math.max(ledger.gradedThrough, week), entries };
}

export interface LabRecord {
  wins: number;
  losses: number;
  bets: number;
  hit: number | null;
  /** ROI at −110. */
  roi: number | null;
}

export function recordOf(results: readonly WeekResult[], fromWeek = 0): LabRecord {
  const rs = results.filter((r) => r.week >= fromWeek);
  const wins = rs.reduce((s, r) => s + r.wins, 0);
  const losses = rs.reduce((s, r) => s + r.losses, 0);
  const bets = wins + losses;
  return { wins, losses, bets, hit: bets ? wins / bets : null, roi: bets ? (wins * (100 / 110) - losses) / bets : null };
}

/** One-sided P(≥ wins | true hit = break-even), normal approximation. */
export function pValue(r: LabRecord): number | null {
  if (r.bets === 0) return null;
  const p0 = LAB.breakeven;
  const c = normCdf((r.wins - r.bets * p0) / Math.sqrt(r.bets * p0 * (1 - p0)));
  return c === null ? null : 1 - c;
}

export interface Verdict {
  status: 'champion' | 'ready' | 'watching' | 'retired';
  record: LabRecord;
  /** The champion's record over the same weeks. */
  champion: LabRecord;
  p: number | null;
}

/** Ready = ≥ 60 forward bets, p < 0.05 vs break-even, ROI above the champion's over the same weeks. */
export function verdictOf(ledger: Ledger, e: LedgerEntry): Verdict {
  const champ = ledger.entries.find((x) => x.kind === 'champion');
  const record = recordOf(e.results);
  const champion = recordOf(champ?.results ?? [], e.firstWeek);
  const p = pValue(record);
  if (e.kind === 'champion') return { status: 'champion', record, champion, p };
  if (e.retired) return { status: 'retired', record, champion, p };
  const ready = record.bets >= LAB.promoteMinBets && p !== null && p < LAB.promoteMaxP && record.roi !== null && record.roi > (champion.roi ?? 0);
  return { status: ready ? 'ready' : 'watching', record, champion, p };
}

/** Same rule regardless of condition order. */
const sameRule = (a: Rule, b: Rule) => a.market === b.market && a.side === b.side && [...a.conds.map((c) => `${c.feature}${c.op}${c.threshold}`)].sort().join('&') === [...b.conds.map((c) => `${c.feature}${c.op}${c.threshold}`)].sort().join('&');

/**
 * Freeze new challengers for `firstWeek` from this week's search survivors (best first), skipping
 * rules already in the ledger and near-copies of an active one (bets overlap > `maxOverlap` on
 * `rows`, the search rows); then retire losers with enough bets and trim to `maxActive`.
 * Ids are `c<n>`, numbered across the whole ledger.
 */
export function addChallengers(ledger: Ledger, survivors: readonly Scored[], firstWeek: number, source: string, rows: readonly FeatureRow[] = []): Ledger {
  const entries = [...ledger.entries];
  let seq = entries.filter((e) => e.kind === 'challenger').length + 1;
  let added = 0;
  for (const s of survivors) {
    if (added >= LAB.newPerWeek) break;
    const rule: Rule = { market: s.market, side: s.side, conds: s.conds };
    const active = entries.filter((e): e is LedgerEntry & { rule: Rule } => !!e.rule && !e.retired);
    if (entries.some((e) => e.rule && sameRule(e.rule, rule))) continue;
    if (rows.length > 0 && active.some((e) => overlap(e.rule, rule, rows) > LAB.maxOverlap)) continue;
    entries.push({ id: `c${seq++}`, kind: 'challenger', rule, firstWeek, source, results: [] });
    added++;
  }
  const next: Ledger = { ...ledger, entries };
  const retireWeek = firstWeek - 1;
  next.entries = next.entries.map((e) => {
    if (e.kind !== 'challenger' || e.retired) return e;
    const r = recordOf(e.results);
    return r.bets >= LAB.retireMinBets && (r.roi ?? 0) < 0 ? { ...e, retired: { week: retireWeek, reason: `losing after ${r.bets} bets` } } : e;
  });
  const active = next.entries.filter((e) => e.kind === 'challenger' && !e.retired);
  if (active.length > LAB.maxActive) {
    const worst = [...active].sort((a, b) => (recordOf(a.results).roi ?? 0) - (recordOf(b.results).roi ?? 0)).slice(0, active.length - LAB.maxActive);
    const ids = new Set(worst.map((e) => e.id));
    next.entries = next.entries.map((e) => (ids.has(e.id) ? { ...e, retired: { week: retireWeek, reason: 'over the active cap (worst record)' } } : e));
  }
  return next;
}

const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1)}%`);
const sgn = (x: number | null) => (x === null ? '—' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`);

/** The weekly scoreboard (markdown). */
export function scoreboard(ledger: Ledger, generatedAt: string): string {
  const champ = ledger.entries.find((e) => e.kind === 'champion');
  const rows = ledger.entries.map((e) => {
    const v = verdictOf(ledger, e);
    const weeks = e.results.map((r) => `W${r.week} ${r.wins}-${r.losses}`).join(' · ') || '—';
    const status = v.status === 'ready' ? '**READY — needs Kobe’s OK**' : v.status;
    return `| ${e.id} | ${status} | ${e.rule ? ruleText(e.rule) : e.source} | W${e.firstWeek} | ${v.record.wins}-${v.record.losses} | ${pct(v.record.hit)} | ${sgn(v.record.roi)} | ${v.p === null ? '—' : v.p.toFixed(3)} | ${sgn(v.champion.roi)} | ${weeks} |`;
  });
  const ready = ledger.entries.filter((e) => verdictOf(ledger, e).status === 'ready');
  return `# Leans lab — ${ledger.season} scoreboard (graded through week ${ledger.gradedThrough})

Generated ${generatedAt}. Every rule is frozen before the games it's graded on; all bets at −110 (break-even ${pct(LAB.breakeven)}).
Promotion bar: ≥ ${LAB.promoteMinBets} forward bets, one-sided p < ${LAB.promoteMaxP}, ROI above the champion's over the same weeks. **Nothing goes live without Kobe's OK.**

${ready.length > 0 ? `## Ready to promote\n\n${ready.map((e) => `- ${e.id}: ${e.rule ? ruleText(e.rule) : ''}`).join('\n')}\n` : '## Ready to promote\n\nNone yet.\n'}
## Champion: ${champ ? `${recordOf(champ.results).wins}-${recordOf(champ.results).losses}, ${sgn(recordOf(champ.results).roi)}` : '—'}

| Id | Status | Rule | From | W-L | Hit % | ROI | p | Champion ROI (same weeks) | Weeks |
|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
}

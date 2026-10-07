/**
 * Snapshot guard for the ranking extraction (My Team plan, P1 / F3c).
 *
 * Records every useRanking + calculateBulkRanking result for each available
 * offense/defense metric × 32 teams (+ special rows, unknown team/metric,
 * both directions) on deterministic fixture TeamData with deliberate ties,
 * near-ties inside the 0.001 tolerance, string values, NaN and missing values.
 * The snapshot is committed BEFORE lib/ranking.ts exists; the refactor commit
 * must leave it byte-identical.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

// useRanking is a hook only because of useMemo — run its body directly.
vi.mock('react', () => ({ useMemo: (fn: () => unknown) => fn() }));

import { useRanking, calculateBulkRanking, type RankingResult } from '../useRanking';
import type { TeamData } from '../useNflStats';
import { NFL_TEAMS } from '../teams';
import { getAvailableMetrics } from '../metricsConfig';

/** Small deterministic PRNG (mulberry32) so the fixture never changes. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildFixture(side: 'offense' | 'defense', seed: number): { rows: TeamData[]; metrics: string[] } {
  const metrics = Object.keys(getAvailableMetrics(side));
  const rand = prng(seed);
  const rows: TeamData[] = NFL_TEAMS.map((t, i) => {
    const row: TeamData = { team: t.name };
    for (const m of metrics) {
      // Coarse integers → plenty of exact ties; every 3rd value a decimal; every 5th a string.
      const base = Math.floor(rand() * 12);
      const v = (i + metrics.indexOf(m)) % 3 === 0 ? base + 0.5 : base;
      row[m] = (i + metrics.indexOf(m)) % 5 === 0 ? String(v) : v;
    }
    return row;
  });
  const m0 = metrics[0];
  const m1 = metrics[1];
  // Near-tie inside the 0.001 tolerance, and one just outside it.
  rows[0][m0] = 5.7;
  rows[1][m0] = 5.7004;
  rows[2][m0] = 5.702;
  // NaN, missing (→ '0') and zero.
  rows[3][m1] = 'N/A';
  delete rows[4][m1];
  rows[5][m1] = 0;
  // Special rows that must be excluded by default.
  rows.push({ team: 'Avg Team', ...Object.fromEntries(metrics.map((m) => [m, 99])) });
  rows.push({ team: 'League Total', ...Object.fromEntries(metrics.map((m) => [m, -99])) });
  return { rows, metrics: [...metrics, 'not_a_metric'] };
}

const fmt = (r: RankingResult | null) =>
  r ? `${r.rank}|${r.formattedRank}|${r.isTied ? 1 : 0}|${r.totalTeams}|${r.teamsWithSameValue}` : 'null';

describe('ranking snapshot (useRanking + calculateBulkRanking)', () => {
  beforeAll(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  for (const [side, seed] of [['offense', 11], ['defense', 29]] as const) {
    it(`${side}: every metric × team × direction is unchanged`, () => {
      const { rows, metrics } = buildFixture(side, seed);
      const targets = [...rows.map((r) => r.team), 'Not A Team'];
      const out: Record<string, string> = {};
      for (const metric of metrics) {
        for (const higherIsBetter of [true, false]) {
          for (const team of targets) {
            out[`${metric}|${higherIsBetter ? 'hi' : 'lo'}|${team}`] = fmt(useRanking(rows, metric, team, { higherIsBetter }));
          }
          const bulk = calculateBulkRanking(rows, metric, targets, { higherIsBetter });
          for (const team of targets) {
            out[`bulk|${metric}|${higherIsBetter ? 'hi' : 'lo'}|${team}`] = fmt(bulk[team]);
          }
        }
        // Special rows included.
        out[`${metric}|incl-special|${rows[0].team}`] = fmt(useRanking(rows, metric, rows[0].team, { excludeSpecialTeams: false }));
        out[`${metric}|incl-special|Avg Team`] = fmt(useRanking(rows, metric, 'Avg Team', { excludeSpecialTeams: false }));
      }
      // Guards: empty data / empty metric / empty target.
      out['guard|empty-data'] = fmt(useRanking([], metrics[0], rows[0].team));
      out['guard|empty-metric'] = fmt(useRanking(rows, '', rows[0].team));
      out['guard|empty-team'] = fmt(useRanking(rows, metrics[0], ''));
      out['guard|bulk-empty'] = JSON.stringify(calculateBulkRanking([], metrics[0], [rows[0].team]));
      expect(out).toMatchSnapshot();
    });
  }
});

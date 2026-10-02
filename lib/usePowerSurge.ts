/**
 * usePowerSurge — is each team's half of this card "powered"?
 * (top-5 rank in ≥ 3 of the card's metrics; rules in lib/powerSurge.ts)
 *
 * Ranks are computed exactly like the row badges (calculateBulkRanking with the
 * same direction rule: defense inverts higherIsBetter) on the SAME data the
 * rows rank (per-game or total), so the effect always agrees with the badges.
 */

'use client';

import { useMemo } from 'react';
import type { TeamData } from '@/lib/useNflStats';
import { calculateBulkRanking } from '@/lib/useRanking';
import { AVAILABLE_METRICS } from '@/lib/metricsConfig';
import { isPowered } from '@/lib/powerSurge';

const present = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '';

export function usePowerSurge(
  allData: TeamData[],
  metrics: string[],
  teamA: string,
  teamB: string,
  panelType: 'offense' | 'defense',
): { a: boolean; b: boolean } {
  return useMemo(() => {
    if (!allData.length || !teamA || !teamB) return { a: false, b: false };
    const ranksA: (number | null)[] = [];
    const ranksB: (number | null)[] = [];
    const rowA = allData.find((t) => t.team === teamA);
    const rowB = allData.find((t) => t.team === teamB);
    for (const key of metrics) {
      const cfg = AVAILABLE_METRICS[key];
      const higherIsBetter = cfg ? (panelType === 'defense' ? !cfg.higherIsBetter : cfg.higherIsBetter) : true;
      const r = calculateBulkRanking(allData, key, [teamA, teamB], { higherIsBetter, excludeSpecialTeams: true });
      ranksA.push(present(rowA?.[key]) ? r[teamA]?.rank ?? null : null);
      ranksB.push(present(rowB?.[key]) ? r[teamB]?.rank ?? null : null);
    }
    return { a: isPowered(ranksA), b: isPowered(ranksB) };
  }, [allData, metrics, teamA, teamB, panelType]);
}

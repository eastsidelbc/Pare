/**
 * Compact Comparison Row
 * 
 * Two-line layout: Data line (padded) + Bar line (edge-to-edge)
 * LAYOUT: theScore compact structure (~52px total height)
 * STYLE: Pare visual design (green/orange gradients, NO borders)
 * INTERACTION: Tap rank text (30th) to open dropdown
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { AVAILABLE_METRICS } from '@/lib/metricsConfig';
import { useRanking } from '@/lib/useRanking';
import { useBarCalculation } from '@/lib/useBarCalculation';
import type { TeamData } from '@/lib/useNflStats';
import CompactRankingDropdown from './CompactRankingDropdown';

interface CompactComparisonRowProps {
  metricField: string;
  teamA: string;
  teamB: string;
  teamAData: TeamData | null;
  teamBData: TeamData | null;
  allData: TeamData[];
  panelType: 'offense' | 'defense';
  displayMode: 'per-game' | 'total';
  activeDropdownTeam?: 'A' | 'B' | null;  // Which dropdown is open
  onTeamAChange?: (team: string) => void;  // Team change handler
  onTeamBChange?: (team: string) => void;  // Team change handler
  onDropdownToggle?: (team: 'A' | 'B') => void;  // Toggle dropdown
}

function CompactComparisonRow({
  metricField,
  teamA,
  teamB,
  teamAData,
  teamBData,
  allData,
  panelType,
  displayMode,
  activeDropdownTeam,
  onTeamAChange,
  onTeamBChange,
  onDropdownToggle
}: CompactComparisonRowProps) {
  
  const metricConfig = AVAILABLE_METRICS[metricField];

  // Detect presence — a metric may be intentionally unpopulated (e.g. defense
  // yards-allowed in 2026), in which case we render "—" instead of a fake 0.
  // Null-safe: the early return below runs AFTER the hooks (rules-of-hooks).
  const rawA = teamAData?.[metricField];
  const rawB = teamBData?.[metricField];
  const isPresent = (v: unknown): boolean =>
    v !== undefined && v !== null && String(v).trim() !== '';
  const hasA = isPresent(rawA);
  const hasB = isPresent(rawB);

  // Values used only for bar/ranking math (never for display when missing).
  const teamAValue = hasA ? String(rawA) : '0';
  const teamBValue = hasB ? String(rawB) : '0';

  // Ranking direction: offense uses the metric default, defense inverts. Neutral
  // fallback keeps the hook call valid even when metricConfig is missing.
  const higherIsBetter = metricConfig
    ? panelType === 'defense'
      ? !metricConfig.higherIsBetter
      : metricConfig.higherIsBetter
    : true;

  // ── Hooks: ALWAYS called, same order every render, BEFORE any early return
  //    (rules-of-hooks). Results are simply unused if we bail out below. ──
  const teamARanking = useRanking(allData, metricField, teamA, {
    higherIsBetter,
    excludeSpecialTeams: true,
  });

  const teamBRanking = useRanking(allData, metricField, teamB, {
    higherIsBetter,
    excludeSpecialTeams: true,
  });

  const { teamAPercentage, teamBPercentage } = useBarCalculation({
    teamAValue,
    teamBValue,
    teamARanking,
    teamBRanking,
    panelType,
    metricName: metricConfig?.name ?? '',
  });

  // Nothing to render without config/data (the hooks above have already run).
  if (!metricConfig || !teamAData || !teamBData) {
    return null;
  }

  // Format values
  const formatValue = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '—';
    
    switch (metricConfig.format) {
      case 'percentage':
        return `${num.toFixed(1)}%`;
      case 'decimal':
        return num.toFixed(1);
      case 'time':
        return value; // Time format (MM:SS)
      case 'number':
      default:
        return num.toFixed(0);
    }
  };
  
  const formattedA = hasA ? formatValue(teamAValue) : '—';
  const formattedB = hasB ? formatValue(teamBValue) : '—';

  // Bars only make sense when BOTH sides have a real value.
  const barsVisible = hasA && hasB;
  
  // Format ranking for display — correct ordinal (21st, 22nd, 23rd, not 21th)
  const formatRank = (rank: number | null): string => {
    if (!rank) return '';
    const lastTwo = rank % 100;
    const lastOne = rank % 10;
    let suffix = 'th';
    // 11, 12, 13 are exceptions — always "th"
    if (lastTwo < 11 || lastTwo > 13) {
      if (lastOne === 1) suffix = 'st';
      else if (lastOne === 2) suffix = 'nd';
      else if (lastOne === 3) suffix = 'rd';
    }
    return `${rank}${suffix}`;
  };
  
  return (
    <div className="relative">
      
      {/* LINE 1: Data + Ranks + Metric Name — 3-column grid, perfectly balanced */}
      <div className="px-3 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-1">
        
        {/* Team A: Value + Rank (left-aligned) */}
        <div className="flex items-baseline gap-1">
          <span className="text-[15px] font-semibold text-white tabular-nums">
            {formattedA}
          </span>
          <CompactRankingDropdown
            allData={allData}
            metricKey={metricField}
            currentTeam={teamA}
            panelType={panelType}
            onTeamChange={onTeamAChange || (() => {})}
            isOpen={activeDropdownTeam === 'A'}
            onToggle={() => onDropdownToggle?.('A')}
            ranking={hasA && teamARanking ? { 
              rank: teamARanking.rank, 
              formattedRank: formatRank(teamARanking.rank),
              isTied: teamARanking.isTied
            } : null}
            position="left"
          />
        </div>
        
        {/* Center: Metric Name — fixed-width, never stretches */}
        <div className="text-center px-1">
          <span className="uppercase whitespace-nowrap" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--subtext)' }}>
            {metricConfig.name}
          </span>
        </div>
        
        {/* Team B: Rank + Value (right-aligned) */}
        <div className="flex items-baseline gap-1 justify-end">
          <CompactRankingDropdown
            allData={allData}
            metricKey={metricField}
            currentTeam={teamB}
            panelType={panelType}
            onTeamChange={onTeamBChange || (() => {})}
            isOpen={activeDropdownTeam === 'B'}
            onToggle={() => onDropdownToggle?.('B')}
            ranking={hasB && teamBRanking ? { 
              rank: teamBRanking.rank, 
              formattedRank: formatRank(teamBRanking.rank),
              isTied: teamBRanking.isTied
            } : null}
            position="right"
          />
          <span className="text-[15px] font-semibold text-white tabular-nums">
            {formattedB}
          </span>
        </div>
        
      </div>
      
      {/* LINE 2: theScore-style inward bars — proportional meeting point,
          animated into place, rounded outer ends. teamA% + teamB% ≈ 98 (2%
          reserved as the center gap), preserving the sacred bar math. */}
      <div className="px-3 pb-2 pt-0.5">
        {barsVisible ? (
          <div className="flex h-[7px] w-full items-stretch">
            {/* Team A bar — grows inward from the left (green) */}
            <motion.div
              className="h-full rounded-l-full"
              style={{ background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)' }}
              initial={false}
              animate={{ width: `${teamAPercentage}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 30 }}
            />
            {/* Center gap */}
            <div className="h-full" style={{ width: '2%' }} />
            {/* Team B bar — grows inward from the right (fire) */}
            <motion.div
              className="ml-auto h-full rounded-r-full"
              style={{ background: 'linear-gradient(90deg, #ff6b35 0%, #ea580c 100%)' }}
              initial={false}
              animate={{ width: `${teamBPercentage}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 30 }}
            />
          </div>
        ) : (
          /* No live data for one/both sides — neutral track, no fake bars. */
          <div className="h-[7px] w-full rounded-full bg-white/5" />
        )}
      </div>
      
    </div>
  );
}

export default memo(CompactComparisonRow);


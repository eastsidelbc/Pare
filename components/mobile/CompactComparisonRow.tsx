/**
 * Compact Comparison Row
 * 
 * Two-line layout: Data line (padded) + Bar line (edge-to-edge)
 * LAYOUT: theScore compact structure (~48px total height)
 * STYLE: Neon Frame (Round 5 "R") — split-capsule bar in team colors, white stats
 * INTERACTION: Tap rank text (30th) to open dropdown
 */

'use client';

import { memo, useCallback } from 'react';
import { AVAILABLE_METRICS } from '@/lib/metricsConfig';
import { useRanking } from '@/lib/useRanking';
import { useBarCalculation } from '@/lib/useBarCalculation';
import type { TeamData } from '@/lib/useNflStats';
import CompactRankingDropdown from './CompactRankingDropdown';
import SplitCapsuleBar from '@/components/ui/SplitCapsuleBar';
import { getRankTier } from '@/lib/rankTier';
import type { BarPalette } from '@/lib/teamColors';

/**
 * StatValue — one stat number as plain text. A missing metric shows "—" and a
 * time value (MM:SS) shows as-is.
 *
 * PERF (2026-10-03): this used to be a NumberFlow "odometer" roll. With 20 on
 * screen, each one re-measured the page on every team swap (~375ms of forced
 * layout at 4x CPU throttle) — the #1 cause of the swap freeze. The bars carry
 * the motion now; numbers just swap.
 */
const STAT_CLS = 'text-[15px] leading-[18px] font-bold text-text tabular-nums';

function StatValue({
  raw,
  present,
  format,
}: {
  raw: string;
  present: boolean;
  format: 'number' | 'decimal' | 'percentage' | 'time';
}) {
  if (!present) return <span className={STAT_CLS}>—</span>;
  if (format === 'time') return <span className={STAT_CLS}>{raw}</span>;

  const num = parseFloat(raw);
  if (Number.isNaN(num)) return <span className={STAT_CLS}>—</span>;

  const digits = format === 'number' ? 0 : 1;
  const text = num.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return <span className={STAT_CLS}>{format === 'percentage' ? `${text}%` : text}</span>;
}

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
  /** Toggle this row's A/B menu (stable identity from the panel — keeps memo). */
  onDropdownToggle?: (metricKey: string, team: 'A' | 'B') => void;
  /** Close whichever menu is open (stable, idempotent). */
  onDropdownClose?: () => void;
  /** Team bar colors for this matchup (lib/teamColors, resolved once per panel). */
  paletteA: BarPalette;
  paletteB: BarPalette;
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
  onDropdownToggle,
  onDropdownClose,
  paletteA,
  paletteB,
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

  const toggleA = useCallback(() => onDropdownToggle?.(metricField, 'A'), [onDropdownToggle, metricField]);
  const toggleB = useCallback(() => onDropdownToggle?.(metricField, 'B'), [onDropdownToggle, metricField]);
  const closeMenu = useCallback(() => onDropdownClose?.(), [onDropdownClose]);
  const noop = useCallback(() => {}, []);

  // Nothing to render without config/data (the hooks above have already run).
  if (!metricConfig || !teamAData || !teamBData) {
    return null;
  }

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
    // contain: layout — a bar resizing (team swap spring) can only re-layout its own
    // row, never the whole card (perf Pass 4).
    <div className="relative" style={{ contain: 'layout' }}>
      
      {/* LINE 1: Data + Ranks + Metric Name — 3-column grid, perfectly balanced */}
      <div className="px-3 pt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-1">
        
        {/* Team A: Value + Rank (left-aligned) */}
        <div className="flex items-baseline gap-1">
          <StatValue raw={teamAValue} present={hasA} format={metricConfig.format} />
          <CompactRankingDropdown
            allData={allData}
            metricKey={metricField}
            currentTeam={teamA}
            panelType={panelType}
            onTeamChange={onTeamAChange || noop}
            isOpen={activeDropdownTeam === 'A'}
            onToggle={toggleA}
            onClose={closeMenu}
            ranking={hasA && teamARanking ? { 
              rank: teamARanking.rank, 
              formattedRank: formatRank(teamARanking.rank),
              isTied: teamARanking.isTied,
              totalTeams: teamARanking.totalTeams
            } : null}
            position="left"
          />
        </div>
        
        {/* Center: Metric Name — fixed-width, never stretches */}
        <div className="text-center px-1 leading-none">
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
            onTeamChange={onTeamBChange || noop}
            isOpen={activeDropdownTeam === 'B'}
            onToggle={toggleB}
            onClose={closeMenu}
            ranking={hasB && teamBRanking ? { 
              rank: teamBRanking.rank, 
              formattedRank: formatRank(teamBRanking.rank),
              isTied: teamBRanking.isTied,
              totalTeams: teamBRanking.totalTeams
            } : null}
            position="right"
          />
          <StatValue raw={teamBValue} present={hasB} format={metricConfig.format} />
        </div>
        
      </div>
      
      {/* LINE 2: Round 5 "R" split-capsule neon bar — proportional meeting point
          from useBarCalculation (sacred math untouched), team colors, rank-tier
          effects (#1 gold ring + sparks, #2–5 soft breathe). */}
      <div className="px-3 pb-1.5 pt-[5px]">
        {barsVisible ? (
          <SplitCapsuleBar
            teamAPercentage={teamAPercentage}
            teamBPercentage={teamBPercentage}
            paletteA={paletteA}
            paletteB={paletteB}
            tierA={getRankTier(teamARanking?.rank, teamARanking?.totalTeams)}
            tierB={getRankTier(teamBRanking?.rank, teamBRanking?.totalTeams)}
            height={10}
            effectKey={`${teamA}|${teamB}|${displayMode}`}
          />
        ) : (
          /* No live data for one/both sides — neutral track, no fake bars. */
          <div className="w-full rounded-full" style={{ height: 10, border: '1px solid var(--hairline)' }} />
        )}
      </div>
      
    </div>
  );
}

export default memo(CompactComparisonRow);

/**
 * Compact Ranking Dropdown
 * 
 * Rank-badge dropdown (Floating UI): every team ranked by this metric.
 * Neon Frame "R" look (components/ui/neonMenu) — 40px rows:
 *   [rank badge] [TeamMark] Nickname ............ value
 * No logo artwork. Height follows the screen (viewport minus bottom-nav reserve).
 * INTERACTION: Sleek dropdown — spring pop, blurred backdrop, staggered rows; listbox/option a11y
 * POSITIONING: Floating UI with auto-flip, shift, and boundary detection
 */

'use client';

import { useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFloating, flip, shift, offset, autoUpdate, useDismiss, useInteractions, FloatingPortal, size, inline } from '@floating-ui/react';
import type { TeamData } from '@/lib/useNflStats';
import { calculateBulkRanking, type RankingOptions } from '@/lib/useRanking';
import { AVAILABLE_METRICS, formatMetricValue } from '@/lib/metricsConfig';
import { isAverageTeam, isNonSelectableSpecialTeam } from '@/utils/teamHelpers';
import { BarChart3 } from 'lucide-react';
import TeamMark from '@/components/ui/TeamMark';
import { getTeamByName } from '@/lib/teams';
import { MENU_VIEWPORT_PADDING, menuBackdrop, menuHeader, menuMaxHeight, menuRowStyle, menuSurface } from '@/components/ui/neonMenu';
import RankBadge from '@/components/ui/RankBadge';

interface CompactRankingDropdownProps {
  allData: TeamData[];
  metricKey: string;
  currentTeam: string;
  panelType: 'offense' | 'defense';
  onTeamChange: (teamName: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  ranking: { rank: number; formattedRank: string; isTied: boolean } | null;
  position: 'left' | 'right'; // Team A = left (dropdown appears right), Team B = right (dropdown appears left)
}

interface TeamWithRanking {
  team: TeamData;
  ranking: {
    rank: number;
    formattedRank: string;
    isTied: boolean;
  } | null;
  value: string;
  formattedValue: string;
}

export default function CompactRankingDropdown({
  allData,
  metricKey,
  currentTeam,
  panelType,
  onTeamChange,
  isOpen,
  onToggle,
  ranking,
  position
}: CompactRankingDropdownProps) {
  
  const metric = AVAILABLE_METRICS[metricKey];
  
  // Floating UI setup with smart positioning
  // Team A (left) → dropdown appears RIGHT of badge
  // Team B (right) → dropdown appears LEFT of badge
  const { refs, context, x, y, strategy: floatingStrategy } = useFloating({
    strategy: 'fixed',  // Phase 2B: Use viewport positioning
    open: isOpen,
    onOpenChange: onToggle,
    placement: position === 'left' ? 'right-start' : 'left-start',
    middleware: [
      offset(8), // 8px gap from trigger
      flip({
        fallbackPlacements: ['bottom-start', 'top-start', 'right-start', 'left-start'],  // Phase 2C: Robust fallbacks
        padding: MENU_VIEWPORT_PADDING
      }),
      shift({
        padding: MENU_VIEWPORT_PADDING // clear of screen edges + bottom nav
      }),
      size({  // HEIGHT follows the screen (taller list on bigger devices)
        padding: MENU_VIEWPORT_PADDING,
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${menuMaxHeight(availableHeight)}px`,
            width: 'min(272px, calc(100vw - 24px))'
          });
        }
      }),
      inline()  // Phase 2C: Better inline element positioning
    ],
    whileElementsMounted: autoUpdate
  });

  const dismiss = useDismiss(context, {
    outsidePress: true,
    escapeKey: true
  });

  const { getFloatingProps } = useInteractions([
    dismiss  // Removed useClick - we control state externally with isOpen/onToggle
  ]);

  // Phase 2H: Body scroll lock (mobile only)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Calculate rankings for all teams
  const allTeamRankings = useMemo(() => {
    if (!allData || allData.length === 0 || !metricKey) return {};
    
    const isDefenseMetric = panelType === 'defense';
    const higherIsBetter = isDefenseMetric ? !metric?.higherIsBetter : metric?.higherIsBetter;
    const teamNames = allData.map(team => team.team);
    
    const rankingOptions: RankingOptions = {
      higherIsBetter,
      excludeSpecialTeams: true
    };
    
    return calculateBulkRanking(allData, metricKey, teamNames, rankingOptions);
  }, [allData, metricKey, panelType, metric?.higherIsBetter]);
  
  // Sort teams by rank, append average last
  const sortedTeams: TeamWithRanking[] = useMemo(() => {
    const avgTeam = allData.find(t => isAverageTeam(t.team));
    const regularTeams = allData.filter(t => 
      !isAverageTeam(t.team) &&
      !isNonSelectableSpecialTeam(t.team)
    );
    
    const sorted = regularTeams
      .map(team => {
        const ranking = allTeamRankings[team.team];
        const rawValue = String(team[metricKey] || '0');
        const formattedValue = formatMetricValue(rawValue, metric?.format || 'number');
        
        return {
          team,
          ranking,
          value: rawValue,
          formattedValue
        };
      })
      .filter(item => item.ranking)
      .sort((a, b) => {
        const rankDiff = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
        if (rankDiff !== 0) return rankDiff;
        // Same rank → alphabetical by team name
        return a.team.team.localeCompare(b.team.team);
      });
    
    // Add average team last
    if (avgTeam) {
      const rawValue = String(avgTeam[metricKey] || '0');
      const formattedValue = formatMetricValue(rawValue, metric?.format || 'number');
      sorted.push({
        team: avgTeam,
        ranking: null,
        value: rawValue,
        formattedValue
      });
    }
    
    return sorted;
  }, [allData, allTeamRankings, metricKey, metric?.format]);
  
  const handleTeamSelect = (teamName: string) => {
    onTeamChange(teamName);
    onToggle();
  };

  // Render rank badge (trigger button)
  const renderRankBadge = () => {
    const isAverage = isAverageTeam(currentTeam);

    if (isAverage) {
      return (
        <span
          className="inline-flex items-center gap-1 font-bold"
          style={{ fontSize: '11px', color: 'var(--muted)' }}
        >
          <BarChart3 size={11} /> AVG
        </span>
      );
    }

    if (!ranking) {
      return (
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>
          N/A
        </span>
      );
    }

    // Custom tiered rank badge (no emoji). `totalTeams` = the actual ranked
    // field size (may be < 32 while data is still loading) so the bottom-5 tier
    // is based on the real count, not a hard-coded 32.
    const totalTeams = allTeamRankings[currentTeam]?.totalTeams;
    return <RankBadge rank={ranking.rank} isTied={ranking.isTied} totalTeams={totalTeams} effects />;
  };
  
  return (
    <>
      {/* Trigger Button */}
      <button
        ref={refs.setReference}
        onClick={onToggle}
        className="inline-flex items-center leading-none transition-opacity active:opacity-50"
        aria-label={`Ranked ${ranking?.formattedRank || 'N/A'} - tap to change`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {renderRankBadge()}
      </button>
      
      {/* Dropdown Portal - renders at document.body level */}
      <FloatingPortal>
        <AnimatePresence>
          {isOpen && refs.reference.current && (  // Phase 2G: Guard null reference
            <>
              {/* Backdrop — dim + subtle blur for depth */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-40"
                style={menuBackdrop}
                onClick={onToggle}
              />
              
              {/* Dropdown Menu - Positioned by Floating UI */}
              <motion.div
                ref={refs.setFloating}
                style={{
                  position: floatingStrategy,  // Phase 2E: Direct positioning
                  top: y ?? 0,
                  left: x ?? 0,
                  ...menuSurface,
                  opacity: (x != null && y != null) ? 1 : 0  // Phase 2F: Hide first-frame flash
                }}
                {...getFloatingProps()}
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="z-100 flex flex-col overflow-hidden rounded-[var(--radius-xl)]"
              >
                {/* Header — which stat this list is ranked by */}
                <div className="flex h-8 shrink-0 items-center px-3.5" style={{ borderBottom: '1px solid var(--hairline)' }}>
                  <h3 className="truncate" style={menuHeader}>
                    Ranked · {metric?.name ?? metricKey}
                  </h3>
                </div>
                <div
                  role="listbox"
                  aria-label="Teams ranked by this metric"
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                >
                {sortedTeams.map((item, index) => {
                  const isAverage = isAverageTeam(item.team.team);
                  const isCurrent = item.team.team === currentTeam;
                  const info = isAverage ? null : getTeamByName(item.team.team);
                  const label = info?.nickname ?? (isAverage ? 'League Avg' : item.team.team);
                  const rankTotal = item.ranking ? allTeamRankings[item.team.team]?.totalTeams : undefined;

                  return (
                    <motion.button
                      key={item.team.team}
                      role="option"
                      aria-selected={isCurrent}
                      aria-label={`${item.ranking ? `${item.ranking.formattedRank}, ` : ''}${item.team.team}, ${item.formattedValue}`}
                      onClick={() => handleTeamSelect(item.team.team)}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16, delay: Math.min(index, 18) * 0.012 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex w-full items-center gap-1.5 pl-2 pr-3.5 active:opacity-50"
                      style={menuRowStyle(index, isCurrent)}
                    >
                      {/* Rank — same tiered badge as the row (static: no ember in lists) */}
                      <span className="flex w-[42px] shrink-0 justify-center">
                        {isAverage ? (
                          <span style={{ color: 'var(--muted)' }}><BarChart3 size={14} /></span>
                        ) : (
                          <RankBadge rank={item.ranking?.rank ?? null} isTied={item.ranking?.isTied} totalTeams={rankTotal} />
                        )}
                      </span>

                      {isAverage ? <span className="w-[35px] shrink-0" /> : <TeamMark teamName={item.team.team} size={14} />}

                      <span
                        className="min-w-0 flex-1 truncate text-left"
                        style={{ fontSize: 13.5, fontWeight: 800, color: isCurrent ? 'var(--gold-bright)' : isAverage ? 'var(--subtext)' : 'var(--text)' }}
                      >
                        {label}
                      </span>

                      <span className="shrink-0 tabular-nums" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--subtext)' }}>
                        {item.formattedValue}
                      </span>
                    </motion.button>
                  );
                })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}

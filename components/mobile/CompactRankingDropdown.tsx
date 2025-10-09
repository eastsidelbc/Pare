/**
 * Compact Ranking Dropdown
 * 
 * Borderless rank dropdown with responsive height using Floating UI for professional positioning
 * LAYOUT: theScore compact structure (responsive height clamp(280px, 40vh, 380px), NO borders)
 * STYLE: Pare visual design (purple accents, steel colors)
 * INTERACTION: Sleek dropdown, opacity feedback
 * POSITIONING: Floating UI with auto-flip, shift, and boundary detection
 */

'use client';

import { useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFloating, flip, shift, offset, autoUpdate, useClick, useDismiss, useInteractions, FloatingPortal, size, inline } from '@floating-ui/react';
import type { TeamData } from '@/lib/useNflStats';
import { calculateBulkRanking, type RankingOptions } from '@/lib/useRanking';
import { AVAILABLE_METRICS, formatMetricValue } from '@/lib/metricsConfig';
import { isAverageTeam, isNonSelectableSpecialTeam, getTeamEmoji } from '@/utils/teamHelpers';
import TeamLogo from '@/components/TeamLogo';
import { d, dumpBox, dumpFloatingState, firstClip, dumpMenuStyles } from '@/debug/traceDropdown';

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
  const { refs, floatingStyles, context, x, y, strategy: floatingStrategy } = useFloating({
    strategy: 'fixed',  // Phase 2B: Use viewport positioning
    open: isOpen,
    onOpenChange: onToggle,
    placement: position === 'left' ? 'right-start' : 'left-start',
    middleware: [
      offset(8), // 8px gap from trigger
      flip({
        fallbackPlacements: ['bottom-start', 'top-start', 'right-start', 'left-start'],  // Phase 2C: Robust fallbacks
        padding: 12
      }),
      shift({
        padding: 12 // Keep 12px from viewport edges
      }),
      size({  // Phase 2C: Dynamic sizing based on available space
        apply({ availableHeight, elements }) {
          const maxH = Math.min(420, Math.max(280, availableHeight - 16));
          Object.assign(elements.floating.style, {
            maxHeight: `${maxH}px`,
            width: 'min(280px, calc(100vw - 24px))'
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

  const { getReferenceProps, getFloatingProps } = useInteractions([
    dismiss  // Removed useClick - we control state externally with isOpen/onToggle
  ]);

  // Phase 2H: Body scroll lock (mobile only)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // DEBUG: Trace dropdown open/close
  useEffect(() => {
    if (isOpen) {
      const side = position === 'left' ? 'teamA' : 'teamB';
      d('dropdown:open', { side, currentTeam, metricKey, placement: context.placement });
      dumpFloatingState(context, refs, floatingStyles, context.placement, side);
      firstClip(refs.reference.current as HTMLElement | null);
      
      // Check menu styles after render
      requestAnimationFrame(() => {
        if (refs.floating.current) {
          dumpMenuStyles(refs.floating.current as HTMLElement, `menu-styles:${side}`);
        }
      });
    } else {
      d('dropdown:close', { currentTeam, metricKey });
    }
  }, [isOpen, context, refs, floatingStyles, position, currentTeam, metricKey]);
  
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
    const emoji = getTeamEmoji(currentTeam);
    
    if (isAverage && emoji) {
      return (
        <span className="text-[11px] font-medium" style={{ color: 'rgb(196, 181, 253)' }}>
          {emoji} Avg
        </span>
      );
    }

    if (!ranking) {
      return (
        <span className="text-[11px] text-purple-400/80 font-medium">
          N/A
        </span>
      );
    }

    // Desktop pattern: Show amber color for ties
    const textColor = ranking.isTied ? 'rgb(251, 191, 36)' : 'rgb(196, 181, 253)';
    
    return (
      <span className="text-[11px] font-medium" style={{ color: textColor }}>
        {ranking.isTied && '🔸 '}({ranking.formattedRank})
      </span>
    );
  };
  
  return (
    <>
      {/* Trigger Button */}
      <button
        ref={refs.setReference}
        onClick={onToggle}
        className="transition-opacity active:opacity-50"
        aria-label={`Ranked ${ranking?.formattedRank || 'N/A'} - tap to change`}
      >
        {renderRankBadge()}
      </button>
      
      {/* Dropdown Portal - renders at document.body level */}
      <FloatingPortal>
        <AnimatePresence>
          {isOpen && refs.reference.current && (  // Phase 2G: Guard null reference
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(0, 0, 0, 0.6)' }}
                onClick={onToggle}
              />
              
              {/* Dropdown Menu - Positioned by Floating UI */}
              <motion.div
                ref={refs.setFloating}
                style={{
                  position: floatingStrategy,  // Phase 2E: Direct positioning
                  top: y ?? 0,
                  left: x ?? 0,
                  opacity: (x != null && y != null) ? 1 : 0  // Phase 2F: Hide first-frame flash
                }}
                {...getFloatingProps()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="z-[100] rounded-2xl shadow-2xl overflow-auto overscroll-contain pb-[calc(64px+env(safe-area-inset-bottom)+12px)]"  // Phase 2E: Safe area padding
              >
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.98)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  {/* Scrollable Team List */}
                {sortedTeams.map((item, index) => {
                  const isAverage = isAverageTeam(item.team.team);
                  const emoji = getTeamEmoji(item.team.team);
                  const isCurrent = item.team.team === currentTeam;
                  const isTied = item.ranking?.isTied || false;
                  
                  return (
                    <button
                      key={item.team.team}
                      onClick={() => handleTeamSelect(item.team.team)}
                      className="w-full px-4 py-3 flex items-center gap-3 transition-all active:opacity-50"
                      style={{
                        background: isCurrent 
                          ? 'rgba(139, 92, 246, 0.2)' 
                          : 'transparent',
                        borderTop: index > 0 && isAverage 
                          ? '1px solid rgba(139, 92, 246, 0.2)' 
                          : 'none'
                      }}
                    >
                      {/* Rank or Emoji - Desktop pattern: amber for ties */}
                      <div 
                        className="w-8 h-8 rounded flex items-center justify-center font-bold text-[11px] flex-shrink-0"
                        style={{
                          background: isAverage 
                            ? 'rgba(139, 92, 246, 0.3)' 
                            : isTied 
                              ? 'rgba(251, 191, 36, 0.2)'  // Amber for ties (desktop pattern)
                              : 'rgba(100, 116, 139, 0.3)',
                          color: isAverage 
                            ? 'rgb(196, 181, 253)' 
                            : isTied 
                              ? 'rgb(251, 191, 36)'  // Amber text for ties
                              : 'rgb(148, 163, 184)'
                        }}
                      >
                        {isAverage ? emoji : (isTied ? '🔸' : item.ranking?.rank)}
                      </div>
                      
                      {/* Logo */}
                      <TeamLogo teamName={item.team.team} size="32" />
                      
                      {/* Team Name */}
                      <div className="flex-1 text-left">
                        <div className="text-[13px] font-semibold text-white">
                          {item.team.team}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.formattedValue}
                        </div>
                      </div>
                      
                      {/* Selected Indicator */}
                      {isCurrent && (
                        <div className="w-2 h-2 rounded-full" style={{ background: 'rgb(139, 92, 246)' }} />
                      )}
                    </button>
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


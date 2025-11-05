/**
 * Interactive Ranking Dropdown Component
 *
 * Transforms static ranking displays into interactive dropdowns that allow users
 * to select any team by their ranking position for each metric.
 *
 * Phase 7.2: Core Component Development
 */

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { TeamData } from '@/lib/useNflStats';
import { calculateBulkRanking, RankingOptions } from '@/lib/useRanking';
import { AVAILABLE_METRICS, formatMetricValue } from '@/lib/metricsConfig';
import { useTheme } from '@/lib/useTheme';
import { isAverageTeam, getTeamDisplayLabel, getTeamEmoji } from '@/utils/teamHelpers';
import { log } from '@/utils/logger';

interface RankingDropdownProps {
  allData: TeamData[];
  metricKey: string;
  currentTeam: string;
  type: 'offense' | 'defense';
  side: 'teamA' | 'teamB';
  onTeamChange: (teamName: string) => void;
  className?: string;
}

interface TeamWithRanking {
  team: TeamData;
  ranking: {
    rank: number;
    formattedRank: string;
    isTied: boolean;
    totalTeams: number;
    teamsWithSameValue: number;
  } | null;
  value: string;
  formattedValue: string;
}

export default function RankingDropdown({
  allData,
  metricKey,
  currentTeam,
  type,
  side,
  onTeamChange,
  className = '',
}: RankingDropdownProps) {
  // State for dropdown open/close
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Reduced motion accessibility preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Get theme colors
  const { getTeamAColor, getTeamBColor } = useTheme();

  const metric = AVAILABLE_METRICS[metricKey];

  const allTeamRankings = useMemo(() => {
    if (!allData || allData.length === 0 || !metricKey) return {};

    const isDefenseMetric = type === 'defense';
    const higherIsBetter = isDefenseMetric ? !metric?.higherIsBetter : metric?.higherIsBetter;

    const teamNames = allData.map((team) => team.team);

    const rankingOptions: RankingOptions = {
      higherIsBetter,
      excludeSpecialTeams: true,
    };

    return calculateBulkRanking(allData, metricKey, teamNames, rankingOptions);
  }, [allData, metricKey, type, metric?.higherIsBetter]);

  // Sort teams
  const sortedTeams: TeamWithRanking[] = useMemo(() => {
    const avgTeam = allData.find((t) => isAverageTeam(t.team));
    const regularTeams = allData.filter((t) => !isAverageTeam(t.team));

    const sorted = regularTeams
      .map((team) => {
        const ranking = allTeamRankings[team.team];
        const rawValue = String(team[metricKey as keyof TeamData] || '0');
        const formattedValue = formatMetricValue(rawValue, metric?.format || 'number');

        return { team, ranking, value: rawValue, formattedValue };
      })
      .filter((item) => item.ranking)
      .sort((a, b) => (a.ranking?.rank || 999) - (b.ranking?.rank || 999));

    if (avgTeam) {
      const rawValue = String(avgTeam[metricKey as keyof TeamData] || '0');
      const formattedValue = formatMetricValue(rawValue, metric?.format || 'number');
      sorted.push({ team: avgTeam, ranking: null, value: rawValue, formattedValue });
    }

    return sorted;
  }, [allData, allTeamRankings, metricKey, metric?.format]);

  const currentTeamRanking = allTeamRankings[currentTeam];
  const isCurrentTeamAverage = isAverageTeam(currentTeam);

  const sideColors = {
    teamA: {
      badge: 'bg-green-500/20 text-white border-green-500/30 hover:bg-green-500/30',
      text: 'text-white',
    },
    teamB: {
      badge: 'bg-orange-500/20 text-white border-orange-500/30 hover:bg-orange-500/30',
      text: 'text-white',
    },
  };
  const colors = sideColors[side];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Diagnostics logging
  useEffect(() => {
    if (!isOpen) return;
    try {
      const viewport =
        typeof window !== 'undefined'
          ? { w: window.innerWidth, h: window.innerHeight }
          : null;
      const container = menuRef.current;
      const rect = container ? container.getBoundingClientRect() : null;
      const styles = container ? window.getComputedStyle(container) : null;

      log('debug', '[Diag:RankingDropdown] open', {
        metricKey,
        side,
        type,
        viewport,
        allDataCount: allData?.length || 0,
        sortedTeamsCount: sortedTeams.length,
        menuRect: rect ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height } : null,
        menuStyles: styles
          ? { maxHeight: styles.maxHeight, overflowY: styles.overflowY }
          : null,
      });
    } catch (err) {
      log('warn', '[Diag:RankingDropdown] error capturing diagnostics', err);
    }
  }, [isOpen, allData, sortedTeams.length, metricKey, side, type, metric?.higherIsBetter]);

  const handleTeamSelect = (teamName: string) => {
    log('info', `[RANKING-DROPDOWN] ${side} selected team: ${teamName}`);
    onTeamChange(teamName);
    setIsOpen(false);
  };

  const getRankEmoji = (rank: number, isTied: boolean) => {
    if (isTied) return '🔸';
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Badge (Closed) */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-1 px-2 py-1.5
          bg-slate-800/80 border border-slate-600/50
          rounded-md text-sm font-medium
          cursor-pointer transition-all duration-200
          min-h-[2rem] min-w-[3rem]
          ${colors.badge}
        `}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
        aria-label={
          isCurrentTeamAverage
            ? `League average selected. Click to see rankings.`
            : `Ranked ${currentTeamRanking?.formattedRank || 'N/A'}. Click to change team.`
        }
      >
        {isCurrentTeamAverage ? (
          <span className="flex items-center gap-1">
            <span role="img" aria-hidden="true">📊</span>
            <span>Avg</span>
          </span>
        ) : (
          <span>{currentTeamRanking?.formattedRank || 'N/A'}</span>
        )}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3 opacity-60" />
        </motion.div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`
              absolute z-50 mt-2 w-80
              bg-slate-900/95 backdrop-blur-sm
              border border-slate-700/50 rounded-lg
              shadow-2xl shadow-black/50
              max-h-[60vh] md:max-h-[500px] overflow-y-auto
              py-2
            `}
            ref={menuRef}
            style={{
              left: side === 'teamB' ? 'auto' : '0',
              right: side === 'teamB' ? '0' : 'auto',
            }}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-700/50">
              <div className="text-xs font-medium text-slate-300">
                {metric?.name || 'Metric'} Rankings
              </div>
              <div className="text-xs text-slate-500">Click to select team</div>
            </div>

            {/* Teams */}
            <div className="py-1">
              {sortedTeams.map((item) => {
                const isSelected = item.team.team === currentTeam;
                const rank = item.ranking?.rank || 999;
                const isTied = item.ranking?.isTied || false;
                const isAverage = isAverageTeam(item.team.team);
                const emoji = getTeamEmoji(item.team.team);
                const displayLabel = getTeamDisplayLabel(item.team.team);

                return (
                  <motion.div
                    key={item.team.team}
                    className={`
                      flex items-center gap-3 px-3 py-3 mx-1
                      rounded-md cursor-pointer
                      hover:bg-slate-800/60 
                      ${isSelected
                        ? `bg-${side === 'teamA' ? 'green' : 'orange'}-500/20 border-l-2 border-l-${side === 'teamA' ? 'green' : 'orange'}-400`
                        : ''}
                      ${isAverage ? 'border-t border-slate-700/50 mt-1 pt-3' : ''}
                      transition-all duration-150
                      min-h-[3rem]
                    `}
                    whileHover={prefersReducedMotion ? undefined : { x: 2 }}
                    onClick={() => handleTeamSelect(item.team.team)}
                  >
                    {/* Rank / Avg */}
                    <div className="flex items-center gap-1 w-12 flex-shrink-0">
                      {isAverage && emoji ? (
                        <>
                          <span className="text-sm" role="img">{emoji}</span>
                          <span className="text-xs font-medium text-slate-300">Avg</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm">{getRankEmoji(rank, isTied)}</span>
                          <span className={`text-xs font-medium ${isTied ? 'text-amber-400' : 'text-slate-300'}`}>
                            {item.ranking?.formattedRank}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Name */}
                    <div className={`flex-1 text-sm font-medium truncate ${isSelected ? colors.text : 'text-white'}`}>
                      {displayLabel}
                    </div>

                    {/* Value */}
                    <div className="text-xs text-slate-400 font-mono">
                      ({item.formattedValue})
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-slate-700/50">
              <div className="text-xs text-slate-500">{sortedTeams.length} teams ranked</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

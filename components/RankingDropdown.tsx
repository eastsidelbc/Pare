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

interface RankingDropdownProps {
  allData: TeamData[];           // All teams data
  metricKey: string;            // Current metric (e.g., "points")
  currentTeam: string;          // Currently selected team
  type: 'offense' | 'defense';  // For higherIsBetter logic
  side: 'teamA' | 'teamB';      // For styling/colors
  onTeamChange: (teamName: string) => void; // Callback when team selected
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
  className = ''
}: RankingDropdownProps) {
  
  // State for dropdown open/close
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Get theme colors for team-specific styling
  const { getTeamAColor, getTeamBColor } = useTheme();
  
  // Get metric configuration
  const metric = AVAILABLE_METRICS[metricKey];
  
  // Calculate rankings for all teams using existing logic
  const allTeamRankings = useMemo(() => {
    if (!allData || allData.length === 0 || !metricKey) {
      return {};
    }
    
    const isDefenseMetric = type === 'defense';
    const higherIsBetter = isDefenseMetric ? !metric?.higherIsBetter : metric?.higherIsBetter;
    
    const teamNames = allData.map(team => team.team);
    
    const rankingOptions: RankingOptions = {
      higherIsBetter,
      excludeSpecialTeams: true
    };
    
    return calculateBulkRanking(allData, metricKey, teamNames, rankingOptions);
  }, [allData, metricKey, type, metric?.higherIsBetter]);

  // Sort teams by rank for dropdown display
  const sortedTeams: TeamWithRanking[] = useMemo(() => {
    return allData
      .map(team => {
        const ranking = allTeamRankings[team.team];
        const rawValue = String(team[metricKey as keyof TeamData] || '0');
        const formattedValue = formatMetricValue(rawValue, metric?.format || 'number');
        
        return {
          team,
          ranking,
          value: rawValue,
          formattedValue
        };
      })
      .filter(item => item.ranking) // Remove teams without valid rankings
      .sort((a, b) => (a.ranking?.rank || 999) - (b.ranking?.rank || 999)); // Sort by rank
  }, [allData, allTeamRankings, metricKey, metric?.format]);

  // Get current team's ranking
  const currentTeamRanking = allTeamRankings[currentTeam];

  // Team-specific styling based on side
  const sideColors = {
    teamA: {
      badge: 'bg-green-500/20 text-white border-green-500/30 hover:bg-green-500/30',  // Changed text-green-400 to text-white
      text: 'text-white'  // Changed from text-green-400 to white
    },
    teamB: {
      badge: 'bg-orange-500/20 text-white border-orange-500/30 hover:bg-orange-500/30',  // Changed text-orange-400 to text-white
      text: 'text-white'  // Changed from text-orange-400 to white
    }
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

  // [Diagnostics] Log counts, filtering behavior, and computed menu sizing when opened
  useEffect(() => {
    if (!isOpen) return;

    try {
      const swControlled = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;
      const isStandalone = typeof window !== 'undefined' && (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
      const viewport = typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight, vv: (window as any).visualViewport?.height } : null;

      const container = menuRef.current;
      const rect = container ? container.getBoundingClientRect() : null;
      const styles = container ? window.getComputedStyle(container) : null;

      console.log('[Diag:RankingDropdown] open', {
        metricKey,
        side,
        type,
        swControlled,
        isStandalone,
        viewport,
        allDataCount: allData?.length || 0,
        sortedTeamsCount: sortedTeams.length,
        rankingOptions: {
          higherIsBetter: (type === 'defense') ? !metric?.higherIsBetter : metric?.higherIsBetter,
          excludeSpecialTeams: true
        },
        menuRect: rect ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height } : null,
        menuStyles: styles ? { maxHeight: styles.maxHeight, overflowY: styles.overflowY, position: styles.position } : null,
      });
    } catch (err) {
      console.log('[Diag:RankingDropdown] error capturing diagnostics', err);
    }
  }, [isOpen, allData, sortedTeams.length, metricKey, side, type, metric?.higherIsBetter]);

  // Handle team selection
  const handleTeamSelect = (teamName: string) => {
    console.log(`🔥 [RANKING-DROPDOWN] ${side} selected team: ${teamName}`);
    console.log(`🔥 [RANKING-DROPDOWN] onTeamChange callback:`, onTeamChange);
    onTeamChange(teamName);
    setIsOpen(false);
  };

  // Render rank emoji for top teams
  const getRankEmoji = (rank: number, isTied: boolean) => {
    if (isTied) return '🔸';
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Compact Rank Badge (Closed State) */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-1 px-2 py-1.5
          bg-slate-800/80 border border-slate-600/50
          rounded-md text-sm font-medium
          cursor-pointer transition-all duration-200
          min-h-[2rem] min-w-[3rem] touch-optimized
          ${colors.badge}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>{currentTeamRanking?.formattedRank || 'N/A'}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3 opacity-60" />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu (Open State) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`
              absolute z-50 mt-2 w-80
              bg-slate-900/95 backdrop-blur-sm
              border border-slate-700/50 rounded-lg
              shadow-2xl shadow-black/50
              max-h-[60vh] md:max-h-[500px] overflow-y-auto momentum-scroll
              py-2
            `}
            ref={menuRef}
            style={{ 
              left: side === 'teamB' ? 'auto' : '0',
              right: side === 'teamB' ? '0' : 'auto'
            }}
          >
            {/* Dropdown Header */}
            <div className="px-3 py-2 border-b border-slate-700/50">
              <div className="text-xs font-medium text-slate-300">
                {metric?.name || 'Metric'} Rankings
              </div>
              <div className="text-xs text-slate-500">
                Click to select team
              </div>
            </div>

            {/* Team List */}
            <div className="py-1">
              {sortedTeams.map((item, index) => {
                const isSelected = item.team.team === currentTeam;
                const rank = item.ranking?.rank || 999;
                const isTied = item.ranking?.isTied || false;

                return (
                  <motion.div
                    key={item.team.team}
                    className={`
                      flex items-center gap-3 px-3 py-3 mx-1
                      rounded-md cursor-pointer
                      hover:bg-slate-800/60 
                      ${isSelected ? `bg-${side === 'teamA' ? 'green' : 'orange'}-500/20 border-l-2 border-l-${side === 'teamA' ? 'green' : 'orange'}-400` : ''}
                      transition-all duration-150
                      min-h-[3rem] touch-optimized
                    `}
                    whileHover={{ x: 2 }}
                    onClick={() => handleTeamSelect(item.team.team)}
                  >
                    {/* Rank Emoji + Number */}
                    <div className="flex items-center gap-1 w-12 flex-shrink-0">
                      <span className="text-sm">
                        {getRankEmoji(rank, isTied)}
                      </span>
                      <span className={`text-xs font-medium ${isTied ? 'text-amber-400' : 'text-slate-300'}`}>
                        {item.ranking?.formattedRank}
                      </span>
                    </div>

                    {/* Team Name */}
                    <div className={`flex-1 text-sm font-medium truncate ${isSelected ? colors.text : 'text-white'}`}>
                      {item.team.team}
                    </div>

                    {/* Metric Value */}
                    <div className="text-xs text-slate-400 font-mono">
                      ({item.formattedValue})
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-slate-700/50">
              <div className="text-xs text-slate-500">
                {sortedTeams.length} teams ranked
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

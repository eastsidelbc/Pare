/**
 * Interactive Team Selection Dropdown Component
 * 
 * Allows users to select any team from an alphabetical list with team logos.
 * Designed for use in panel corners as contextual team selection.
 * Provides seamless team switching directly from comparison panels.
 */

'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TeamData } from '@/lib/useNflStats';
import TeamLogo from '@/components/TeamLogo';

interface TeamDropdownProps {
  currentTeam: string;              // Currently selected team
  onTeamChange: (teamName: string) => void; // Callback when team selected
  side: 'teamA' | 'teamB';          // For styling/colors
  allTeams: TeamData[];             // All available teams
  label?: string;                   // "Team A" or "Team B"
  className?: string;
}

export default function TeamDropdown({
  currentTeam,
  onTeamChange,
  side,
  allTeams,
  label,
  className = ''
}: TeamDropdownProps) {
  
  // State for dropdown open/close
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Filter and sort teams alphabetically
  const sortedTeams = useMemo(() => {
    // Filter out special teams
    const specialTeams = ['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'];
    const availableTeams = allTeams.filter(team => !specialTeams.includes(team.team));
    
    // Sort alphabetically
    return availableTeams.sort((a, b) => a.team.localeCompare(b.team));
  }, [allTeams]);

  // Team-specific styling based on side
  const sideColors = {
    teamA: {
      badge: 'bg-green-500/20 text-white border-green-500/30 hover:bg-green-500/30',
      text: 'text-white',
      highlight: 'bg-green-500/20 border-l-2 border-l-green-400'
    },
    teamB: {
      badge: 'bg-orange-500/20 text-white border-orange-500/30 hover:bg-orange-500/30',
      text: 'text-white',
      highlight: 'bg-orange-500/20 border-l-2 border-l-orange-400'
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

  // Handle team selection
  const handleTeamSelect = useCallback((teamName: string) => {
    onTeamChange(teamName);
    setIsOpen(false);
  }, [onTeamChange]);

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Team Logo Button (Closed State) - Looks identical to original */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer transition-all duration-100 touch-optimized min-w-[3.5rem] min-h-[3.5rem] flex items-center justify-center focus-ring"
        whileHover={{ scale: 1.20 }}
        whileTap={{ scale: 0.97 }}
        aria-label={`${label || 'Team selection'}: ${currentTeam}. Click to change team.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <TeamLogo teamName={currentTeam} size="80" />
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
              absolute z-[60] mt-2 w-72 sm:w-80
              bg-slate-900/95 backdrop-blur-sm
              border border-slate-700/50 rounded-lg
              shadow-2xl shadow-black/50
              max-h-80 overflow-y-auto momentum-scroll
              py-2
            `}
            style={{ 
              left: side === 'teamB' ? 'auto' : '0',
              right: side === 'teamB' ? '0' : 'auto'
            }}
          >
            {/* Dropdown Header */}
            <div className="px-3 py-2 border-b border-slate-700/50">
              <div className="text-xs font-medium text-slate-300">
                {label || `Select ${side === 'teamA' ? 'Team A' : 'Team B'}`}
              </div>
              <div className="text-xs text-slate-500">
                {sortedTeams.length} teams available
              </div>
            </div>

            {/* Team List */}
            <div className="py-1" role="listbox" aria-label={`${label || 'Team'} selection`}>
              {sortedTeams.map((team, index) => {
                const isSelected = team.team === currentTeam;

                return (
                  <motion.div
                    key={team.team}
                    className={`
                      flex items-center gap-3 px-3 py-3 mx-1
                      rounded-md cursor-pointer
                      hover:bg-slate-800/60 
                      ${isSelected ? colors.highlight : ''}
                      transition-all duration-150
                      min-h-[3rem] touch-optimized focus-ring
                    `}
                    whileHover={{ x: 2 }}
                    onClick={() => handleTeamSelect(team.team)}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTeamSelect(team.team);
                      }
                    }}
                  >
                    {/* Team Logo */}
                    <div className="flex-shrink-0">
                      <TeamLogo teamName={team.team} size="24" />
                    </div>

                    {/* Team Name */}
                    <div className={`flex-1 text-sm font-medium truncate ${isSelected ? colors.text : 'text-white'}`}>
                      {team.team}
                    </div>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="text-xs text-green-400">
                        ✓
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-slate-700/50">
              <div className="text-xs text-slate-500">
                Click team to select • Alphabetical order
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

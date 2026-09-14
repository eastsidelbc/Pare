/**
 * Compact Panel Header
 * 
 * Panel header: logos + instant toggle
 * LAYOUT: theScore compact structure (70px height, 40px logos)
 * STYLE: Pare visual design (purple title, borderless logos)
 */

'use client';

import { useRef } from 'react';
import TeamLogo from '@/components/TeamLogo';
import CompactTeamSelector from './CompactTeamSelector';
import type { TeamData } from '@/lib/useNflStats';

interface CompactPanelHeaderProps {
  type: 'offense' | 'defense';
  teamA: string;
  teamB: string;
  displayMode: 'per-game' | 'total';
  onDisplayModeChange: (mode: 'per-game' | 'total') => void;
  activeTeamSelector: 'A' | 'B' | null;
  onTeamAClick?: () => void;  // Opens team selector
  onTeamBClick?: () => void;  // Opens team selector
  onTeamAChange?: (team: string) => void;
  onTeamBChange?: (team: string) => void;
  allData: TeamData[];
}

export default function CompactPanelHeader({
  type,
  teamA,
  teamB,
  displayMode,
  onDisplayModeChange,
  activeTeamSelector,
  onTeamAClick,
  onTeamBClick,
  onTeamAChange,
  onTeamBChange,
  allData
}: CompactPanelHeaderProps) {
  
  // Refs for logo buttons (for Floating UI positioning)
  const teamALogoRef = useRef<HTMLButtonElement>(null);
  const teamBLogoRef = useRef<HTMLButtonElement>(null);
  
  // Instant toggle handler
  const handleToggleMode = () => {
    const newMode = displayMode === 'per-game' ? 'total' : 'per-game';
    onDisplayModeChange(newMode);
  };
  
  return (
    <>
      {/* 3-column grid: logo | center | logo — guarantees title is always pixel-perfect centered */}
      <div className="h-[70px] px-3 grid grid-cols-[44px_1fr_44px] items-center gap-2">
        {/* Team A Logo - Tappable */}
        <button 
          ref={teamALogoRef}
          onClick={onTeamAClick}
          className="flex items-center justify-center transition-opacity active:opacity-50 touch-optimized"
          aria-label={`Change ${teamA}`}
        >
          <TeamLogo teamName={teamA} size="40" />
        </button>
        
        {/* Center Section — always perfectly centered between equal-width columns */}
        <div className="text-center">
          <h2 className="text-[18px] font-bold text-purple-400 capitalize leading-tight">
            {type}
          </h2>
          {/* Display Mode Toggle - Instant Switch */}
          <button
            onClick={handleToggleMode}
            className="text-[11px] font-semibold text-slate-400 tracking-widest transition-colors active:text-purple-400 uppercase mt-0.5"
            aria-label={`Switch to ${displayMode === 'per-game' ? 'total' : 'per game'}`}
          >
            {displayMode === 'per-game' ? 'PER GAME' : 'TOTAL'}
          </button>
        </div>
        
        {/* Team B Logo - Tappable */}
        <button 
          ref={teamBLogoRef}
          onClick={onTeamBClick}
          className="flex items-center justify-center transition-opacity active:opacity-50 touch-optimized"
          aria-label={`Change ${teamB}`}
        >
          <TeamLogo teamName={teamB} size="40" />
        </button>
      </div>

      {/* Team A Selector Dropdown - uses portal, attaches to logo button above */}
      {activeTeamSelector === 'A' && onTeamAChange && (
        <CompactTeamSelector
          allTeams={allData}
          currentTeam={teamA}
          onTeamChange={onTeamAChange}
          isOpen={true}
          onToggle={() => onTeamAClick?.()}
          triggerElement={teamALogoRef.current}
        />
      )}
      
      {/* Team B Selector Dropdown - uses portal, attaches to logo button above */}
      {activeTeamSelector === 'B' && onTeamBChange && (
        <CompactTeamSelector
          allTeams={allData}
          currentTeam={teamB}
          onTeamChange={onTeamBChange}
          isOpen={true}
          onToggle={() => onTeamBClick?.()}
          triggerElement={teamBLogoRef.current}
        />
      )}
    </>
  );
}


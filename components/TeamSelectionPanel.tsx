/**
 * Team Selection Panel Component
 * 
 * Global team selection for comparing 2 teams across both offense and defense.
 * Restores the original behavior of selecting teams once and using them everywhere.
 */

'use client';

import React from 'react';
import { TeamData } from '@/lib/useNflStats';
import TeamSelector from '@/components/TeamSelector';

interface TeamSelectionPanelProps {
  offenseData: TeamData[];
  defenseData: TeamData[];
  onTeamChange: (teamA: string, teamB: string) => void;
  isLoading?: boolean;
  className?: string;
  // Controlled team selection to sync with global state
  currentTeamA?: string;
  currentTeamB?: string;
}

export default function TeamSelectionPanel({
  offenseData,
  defenseData,
  onTeamChange,
  isLoading = false,
  className = '',
  currentTeamA = '',
  currentTeamB = ''
}: TeamSelectionPanelProps) {
  
  // 🎯 SIMPLE: Use global state directly, no internal state management
  const selectedTeamA = currentTeamA;
  const selectedTeamB = currentTeamB;

  // 🎯 SIMPLE: Direct handlers for team changes (no complex sync logic)
  const handleTeamAChange = (teamName: string) => {
    console.log(`🏈 [TEAM-SELECTION-PANEL] Team A changed to: ${teamName}`);
    onTeamChange(teamName, selectedTeamB);
  };

  const handleTeamBChange = (teamName: string) => {
    console.log(`🏈 [TEAM-SELECTION-PANEL] Team B changed to: ${teamName}`);
    onTeamChange(selectedTeamA, teamName);
  };

  // Filter out special teams for team selection
  const specialTeams = ['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'];
  const availableTeams = offenseData.filter(team => !specialTeams.includes(team.team));
  
  // Sort teams alphabetically 
  const sortedTeams = [...availableTeams].sort((a, b) => a.team.localeCompare(b.team));

  // Settings panel state removed - now handled by FloatingMetricsButton

  console.log('🏈 [TEAM-SELECTION-PANEL] Current teams:', { 
    selectedTeamA, 
    selectedTeamB
  });

  return (
    <div className={`bg-slate-900/90 rounded-xl border border-slate-700/50 shadow-lg p-4 max-w-6xl mx-auto w-full ${className}`}>
      {/* Team Selection */}
      <div className="flex items-center gap-6 max-w-2xl mx-auto">
        {/* Centered layout now that settings button is in floating component */}
        
        {/* Team A Selection */}
        <div className="flex-1">
          <TeamSelector
            selectedTeam={selectedTeamA}
            onTeamChange={handleTeamAChange}
            availableTeams={sortedTeams}
            placeholder="Select Team A..."
            disabled={isLoading}
            className="w-full"
          />
        </div>

        {/* VS */}
        <div className="flex-shrink-0 text-2xl font-bold text-slate-400 px-3">
          VS
        </div>

        {/* Team B Selection */}
        <div className="flex-1">
          <TeamSelector
            selectedTeam={selectedTeamB}
            onTeamChange={handleTeamBChange}
            availableTeams={sortedTeams}
            placeholder="Select Team B..."
            disabled={isLoading}
            className="w-full"
          />
        </div>

      </div>


      {/* Status Message */}
      {(!selectedTeamA || !selectedTeamB) && !isLoading && (
        <div className="text-center mt-4">
          <p className="text-slate-400 text-sm">
            Select both teams to start comparing
          </p>
        </div>
      )}

      {isLoading && (
        <div className="text-center mt-4">
          <p className="text-slate-400 text-sm">Loading teams...</p>
        </div>
      )}
    </div>
  );
}

/**
 * Team Selection Panel Component
 * 
 * Global team selection for comparing 2 teams across both offense and defense.
 * Restores the original behavior of selecting teams once and using them everywhere.
 */

'use client';

import React, { useState } from 'react';
import { TeamData } from '@/lib/useNflStats';
import { useTeamSelection } from '@/lib/useTeamSelection';
import TeamSelector from '@/components/TeamSelector';
import MetricsSelector from '@/components/MetricsSelector';

interface TeamSelectionPanelProps {
  offenseData: TeamData[];
  defenseData: TeamData[];
  onTeamChange: (teamA: string, teamB: string) => void;
  selectedOffenseMetrics: string[];
  selectedDefenseMetrics: string[];
  onOffenseMetricsChange: (metrics: string[]) => void;
  onDefenseMetricsChange: (metrics: string[]) => void;
  isLoading?: boolean;
  className?: string;
}

export default function TeamSelectionPanel({
  offenseData,
  defenseData,
  onTeamChange,
  selectedOffenseMetrics,
  selectedDefenseMetrics,
  onOffenseMetricsChange,
  onDefenseMetricsChange,
  isLoading = false,
  className = ''
}: TeamSelectionPanelProps) {
  
  // Global team selection (same teams for both offense and defense)
  const {
    selectedTeamA,
    selectedTeamB,
    setTeamA,
    setTeamB,
    getAvailableTeams,
    isValidSelection
  } = useTeamSelection(offenseData, defenseData, {
    autoSelectOnLoad: true,
    allowSameTeam: false,
    excludeSpecialTeams: false
  });

  // Notify parent component when teams change
  React.useEffect(() => {
    if (isValidSelection) {
      onTeamChange(selectedTeamA, selectedTeamB);
    }
  }, [selectedTeamA, selectedTeamB, isValidSelection, onTeamChange]);

  // Get available teams (filtered and sorted)
  const availableTeams = getAvailableTeams(offenseData);
  
  // Sort teams alphabetically but keep special teams at bottom
  const sortedTeams = [...availableTeams].sort((a, b) => {
    const specialTeams = ['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'];
    
    const aIsSpecial = specialTeams.includes(a.team);
    const bIsSpecial = specialTeams.includes(b.team);
    
    if (aIsSpecial && !bIsSpecial) return 1;
    if (!aIsSpecial && bIsSpecial) return -1;
    
    return a.team.localeCompare(b.team);
  });

  // Settings panel state
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'offense' | 'defense'>('offense');

  console.log('🏈 [TEAM-SELECTION-PANEL] Global teams:', { 
    selectedTeamA, 
    selectedTeamB, 
    isValidSelection, 
    offenseMetrics: selectedOffenseMetrics.length,
    defenseMetrics: selectedDefenseMetrics.length
  });

  return (
    <div className={`bg-slate-900/90 rounded-xl border border-slate-700/50 shadow-lg p-4 max-w-6xl mx-auto w-full ${className}`}>
      {/* Team Selection with Settings */}
      <div className="flex items-center gap-6 max-w-2xl mx-auto transform translate-x-8">
        
        {/* Team A Selection */}
        <div className="flex-1">
          <TeamSelector
            selectedTeam={selectedTeamA}
            onTeamChange={setTeamA}
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
            onTeamChange={setTeamB}
            availableTeams={sortedTeams}
            placeholder="Select Team B..."
            disabled={isLoading}
            className="w-full"
          />
        </div>

        {/* Settings Button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="
              w-10 h-10
              bg-slate-700 hover:bg-slate-600
              text-slate-200
              rounded-lg
              transition-colors
              flex items-center justify-center
            "
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Expandable Settings Panel */}
      {showSettings && (
        <div className="mt-6 bg-slate-800/50 rounded-lg border border-slate-600/30 p-4">
          
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('offense')}
              className={`
                px-4 py-2 text-sm rounded-lg transition-colors
                ${activeTab === 'offense' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }
              `}
            >
              🏈 Offense ({selectedOffenseMetrics.length})
            </button>
            <button
              onClick={() => setActiveTab('defense')}
              className={`
                px-4 py-2 text-sm rounded-lg transition-colors
                ${activeTab === 'defense' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }
              `}
            >
              🛡️ Defense ({selectedDefenseMetrics.length})
            </button>
          </div>

          {/* Metrics Selector */}
          {activeTab === 'offense' && (
            <MetricsSelector
              selectedMetrics={selectedOffenseMetrics}
              onMetricsChange={onOffenseMetricsChange}
              type="offense"
              maxMetrics={99}
            />
          )}

          {activeTab === 'defense' && (
            <MetricsSelector
              selectedMetrics={selectedDefenseMetrics}
              onMetricsChange={onDefenseMetricsChange}
              type="defense"
              maxMetrics={99}
            />
          )}

          {/* Quick Actions */}
          <div className="mt-4 pt-4 border-t border-slate-600/30 flex justify-between">
            <button
              onClick={() => {
                if (activeTab === 'offense') {
                  onOffenseMetricsChange([]);
                } else {
                  onDefenseMetricsChange([]);
                }
              }}
              className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              Clear {activeTab === 'offense' ? 'Offense' : 'Defense'}
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Status Message */}
      {!isValidSelection && !isLoading && (
        <div className="text-center mt-4">
          <p className="text-slate-400 text-sm">
            {!selectedTeamA || !selectedTeamB 
              ? 'Select both teams to start comparing' 
              : 'Invalid team selection'
            }
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

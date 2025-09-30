/**
 * Offense Panel Component
 * 
 * Self-contained offense comparison panel with team selection, metrics customization,
 * and dynamic comparison visualization.
 */

'use client';

import { TeamData } from '@/lib/useNflStats';
import { useDisplayMode } from '@/lib/useDisplayMode';
import DynamicComparisonRow from '@/components/DynamicComparisonRow';
import TeamLogo from '@/components/TeamLogo';
import TeamDropdown from '@/components/TeamDropdown';

interface OffensePanelProps {
  offenseData: TeamData[];
  defenseData: TeamData[]; // For ranking calculations
  selectedTeamA: string;
  selectedTeamB: string;
  selectedMetrics: string[];
  isLoading?: boolean;
  className?: string;
  onTeamAChange?: (teamName: string) => void; // NEW: Team A selection callback
  onTeamBChange?: (teamName: string) => void; // NEW: Team B selection callback
}

export default function OffensePanel({
  offenseData,
  defenseData,
  selectedTeamA,
  selectedTeamB,
  selectedMetrics,
  isLoading = false,
  className = '',
  onTeamAChange,
  onTeamBChange
}: OffensePanelProps) {

  // Display mode (per-game vs total)
  const {
    mode: displayMode,
    setMode: setDisplayMode,
    transformTeamData
  } = useDisplayMode('per-game');

  // No local metrics state - now controlled by parent

  console.log(`🏈 [OFFENSE-PANEL] Teams: ${selectedTeamA} vs ${selectedTeamB}, Mode: ${displayMode}, Metrics: ${selectedMetrics.length}`);

  // Get team data with display mode transformation
  const teamAData = transformTeamData(offenseData.find(team => team.team === selectedTeamA) || null);
  const teamBData = transformTeamData(offenseData.find(team => team.team === selectedTeamB) || null);

  // Check if we have valid team selection
  const isValidSelection = Boolean(selectedTeamA && selectedTeamB && selectedTeamA !== selectedTeamB);

  return (
    <div className={`bg-slate-900/90 rounded-xl border border-slate-700/50 shadow-2xl p-6 max-w-3xl mx-auto w-full ${className}`}>
      
      {/* Panel Header with Team Logos, Title, and Display Mode */}
      <div className="flex items-center justify-between mb-6">
        {/* Team A - Interactive Dropdown */}
        <div className="flex-shrink-0">
          {onTeamAChange ? (
            <TeamDropdown
              currentTeam={selectedTeamA}
              onTeamChange={onTeamAChange}
              side="teamA"
              allTeams={offenseData}
              label="Team A"
            />
          ) : (
            <TeamLogo teamName={selectedTeamA} size="60" />
          )}
        </div>

        {/* Center: Title and Display Mode */}
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-bold text-purple-400 text-center">
            Offense
          </h2>
          
          {/* Display Mode Dropdown */}
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as 'per-game' | 'total')}
            className="px-3 py-2 bg-slate-800/90 border border-slate-600/50 rounded-lg text-slate-200 text-base font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 touch-optimized min-h-[2.75rem]"
            style={{ fontSize: '16px' }}
          >
            <option value="per-game">PER GAME</option>
            <option value="total">TOTAL</option>
          </select>
        </div>

        {/* Team B - Interactive Dropdown */}
        <div className="flex-shrink-0">
          {onTeamBChange ? (
            <TeamDropdown
              currentTeam={selectedTeamB}
              onTeamChange={onTeamBChange}
              side="teamB"
              allTeams={offenseData}
              label="Team B"
            />
          ) : (
            <TeamLogo teamName={selectedTeamB} size="60" />
          )}
        </div>
      </div>


      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="text-slate-400">Loading offense data...</div>
        </div>
      )}

      {/* Comparison Metrics */}
      {!isLoading && isValidSelection && teamAData && teamBData && (
        <div className="space-y-4">
          {selectedMetrics.map((metricKey) => (
            <DynamicComparisonRow
              key={metricKey}
              metricKey={metricKey}
              teamAData={teamAData}
              teamBData={teamBData}
              type="offense"
              allOffenseData={offenseData}
              allDefenseData={defenseData}
              panelType="offense"
              onTeamAChange={onTeamAChange}
              onTeamBChange={onTeamBChange}
            />
          ))}
          
          {selectedMetrics.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No offense metrics selected.
            </div>
          )}
        </div>
      )}

      {/* Invalid Selection State */}
      {!isLoading && !isValidSelection && (
        <div className="text-center py-8 text-slate-400">
          Select both teams to see offense comparison.
        </div>
      )}
    </div>
  );
}

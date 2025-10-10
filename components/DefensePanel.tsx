/**
 * Defense Panel Component
 * 
 * Self-contained defense comparison panel with team selection, metrics customization,
 * and dynamic comparison visualization. Mirrors OffensePanel structure.
 */

'use client';

import { TeamData } from '@/lib/useNflStats';
import { useDisplayMode } from '@/lib/useDisplayMode';
import DynamicComparisonRow from '@/components/DynamicComparisonRow';
import TeamLogo from '@/components/TeamLogo';
import TeamDropdown from '@/components/TeamDropdown';

interface DefensePanelProps {
  defenseData: TeamData[];
  offenseData: TeamData[]; // For ranking calculations
  selectedTeamA: string;
  selectedTeamB: string;
  selectedMetrics: string[];
  isLoading?: boolean;
  className?: string;
  onTeamAChange?: (teamName: string) => void; // NEW: Team A selection callback
  onTeamBChange?: (teamName: string) => void; // NEW: Team B selection callback
}

export default function DefensePanel({
  defenseData,
  offenseData,
  selectedTeamA,
  selectedTeamB,
  selectedMetrics,
  isLoading = false,
  className = '',
  onTeamAChange,
  onTeamBChange
}: DefensePanelProps) {

  // Display mode (per-game vs total)
  const {
    mode: displayMode,
    setMode: setDisplayMode,
    transformTeamData,
    transformAllData
  } = useDisplayMode('per-game');

  // No local metrics state - now controlled by parent

  console.log(`🛡️ [DEFENSE-PANEL] Teams: ${selectedTeamA} vs ${selectedTeamB}, Mode: ${displayMode}, Metrics: ${selectedMetrics.length}`);

  // Transform data based on display mode (rank by displayed values)
  const transformedOffenseData = transformAllData(offenseData);
  const transformedDefenseData = transformAllData(defenseData);
  
  // Get team data with display mode transformation
  const teamAData = transformTeamData(defenseData.find(team => team.team === selectedTeamA) || null);
  const teamBData = transformTeamData(defenseData.find(team => team.team === selectedTeamB) || null);

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
              allTeams={defenseData}
              label="Team A"
            />
          ) : (
            <TeamLogo teamName={selectedTeamA} size="60" />
          )}
        </div>

        {/* Center: Title and Display Mode */}
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-bold text-purple-400 text-center">
            Defense
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
              allTeams={defenseData}
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
          <div className="text-slate-400">Loading defense data...</div>
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
              type="defense"
              allOffenseData={transformedOffenseData}
              allDefenseData={transformedDefenseData}
              panelType="defense"
              onTeamAChange={onTeamAChange}
              onTeamBChange={onTeamBChange}
            />
          ))}
          
          {selectedMetrics.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No defense metrics selected.
            </div>
          )}
        </div>
      )}

      {/* Invalid Selection State */}
      {!isLoading && !isValidSelection && (
        <div className="text-center py-8 text-slate-400">
          Select both teams to see defense comparison.
        </div>
      )}
    </div>
  );
}

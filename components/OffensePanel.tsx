/**
 * Offense Panel Component
 * 
 * Self-contained offense comparison panel with team selection, metrics customization,
 * and dynamic comparison visualization.
 */

'use client';

import { memo, useMemo } from 'react';
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

function OffensePanel({
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
    transformTeamData,
    transformAllData
  } = useDisplayMode('per-game');

  // No local metrics state - now controlled by parent

  if (process.env.NODE_ENV !== 'production') {
    console.log(`🏈 [OFFENSE-PANEL] Teams: ${selectedTeamA} vs ${selectedTeamB}, Mode: ${displayMode}, Metrics: ${selectedMetrics.length}`);
  }

  // Transform data based on display mode (rank by displayed values).
  // Memoized so per-game math over all 32 teams doesn't re-run every render.
  const transformedOffenseData = useMemo(
    () => transformAllData(offenseData),
    [transformAllData, offenseData],
  );
  const transformedDefenseData = useMemo(
    () => transformAllData(defenseData),
    [transformAllData, defenseData],
  );
  
  // Get team data with display mode transformation (memoized so the row memo
  // below is effective — otherwise teamAData/teamBData get a new identity every
  // render and force every DynamicComparisonRow to re-render).
  const teamAData = useMemo(
    () => transformTeamData(offenseData.find(team => team.team === selectedTeamA) || null),
    [transformTeamData, offenseData, selectedTeamA],
  );
  const teamBData = useMemo(
    () => transformTeamData(offenseData.find(team => team.team === selectedTeamB) || null),
    [transformTeamData, offenseData, selectedTeamB],
  );

  // Check if we have valid team selection
  const isValidSelection = Boolean(selectedTeamA && selectedTeamB && selectedTeamA !== selectedTeamB);

  // Overall W-L record lives on the defense (standings) rows — read raw so the
  // "3-0" string isn't touched by the per-game transform.
  const teamARecord = defenseData.find(t => t.team === selectedTeamA)?.record;
  const teamBRecord = defenseData.find(t => t.team === selectedTeamB)?.record;

  return (
    <div className={`bg-surface/90 rounded-xl border border-border/50 shadow-2xl p-6 max-w-3xl mx-auto w-full ${className}`}>
      
      {/* Panel Header with Team Logos, Title, and Display Mode */}
      <div className="flex items-center justify-between mb-6">
        {/* Team A - Interactive Dropdown */}
        <div className="shrink-0 flex flex-col items-center gap-1">
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
          {teamARecord && (
            <span className="tabular-nums text-sm font-semibold text-subtext">{teamARecord}</span>
          )}
        </div>

        {/* Center: Title and Display Mode */}
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-bold text-gold text-center">
            Offense
          </h2>
          
          {/* Display Mode Dropdown */}
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as 'per-game' | 'total')}
            className="px-3 py-2 bg-card/90 border border-border/50 rounded-lg text-text text-base font-medium focus:outline-hidden focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all duration-200 touch-optimized min-h-11"
            style={{ fontSize: '16px' }}
          >
            <option value="per-game">PER GAME</option>
            <option value="total">TOTAL</option>
          </select>
        </div>

        {/* Team B - Interactive Dropdown */}
        <div className="shrink-0 flex flex-col items-center gap-1">
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
          {teamBRecord && (
            <span className="tabular-nums text-sm font-semibold text-subtext">{teamBRecord}</span>
          )}
        </div>
      </div>


      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="text-subtext">Loading offense data...</div>
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
              allOffenseData={transformedOffenseData}
              allDefenseData={transformedDefenseData}
              panelType="offense"
              onTeamAChange={onTeamAChange}
              onTeamBChange={onTeamBChange}
            />
          ))}
          
          {selectedMetrics.length === 0 && (
            <div className="text-center py-8 text-subtext">
              No offense metrics selected.
            </div>
          )}
        </div>
      )}

      {/* Invalid Selection State */}
      {!isLoading && !isValidSelection && (
        <div className="text-center py-8 text-subtext">
          Select both teams to see offense comparison.
        </div>
      )}
    </div>
  );
}

export default memo(OffensePanel);

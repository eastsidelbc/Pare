/**
 * Compact Panel
 * 
 * Complete panel with rows (offense or defense)
 * LAYOUT: theScore compact structure (70px header + 48px rows = ~310px for 5 metrics)
 * STYLE: Pare visual design (purple accents, borderless, rounded)
 */

'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import type { TeamData } from '@/lib/useNflStats';
import { useDisplayMode } from '@/lib/useDisplayMode';
import CompactPanelHeader from './CompactPanelHeader';
import CompactComparisonRow from './CompactComparisonRow';
import CompactRankingDropdown from './CompactRankingDropdown';
import CompactTeamSelector from './CompactTeamSelector';
interface CompactPanelProps {
  type: 'offense' | 'defense';
  teamA: string;
  teamB: string;
  teamAData: TeamData | null;
  teamBData: TeamData | null;
  selectedMetrics: string[];
  allOffenseData: TeamData[];
  allDefenseData: TeamData[];
  onTeamAChange?: (team: string) => void;
  onTeamBChange?: (team: string) => void;
}

function CompactPanel({
  type,
  teamA,
  teamB,
  teamAData,
  teamBData,
  selectedMetrics,
  allOffenseData,
  allDefenseData,
  onTeamAChange,
  onTeamBChange
}: CompactPanelProps) {
  
  // Display mode management (per-game vs total)
  const { mode, setMode, transformTeamData, transformAllData } = useDisplayMode('per-game');
  
  // Ranking dropdown state management
  const [activeDropdown, setActiveDropdown] = useState<{
    metricKey: string;
    team: 'A' | 'B';
  } | null>(null);
  
  // Team selector dropdown state management
  const [activeTeamSelector, setActiveTeamSelector] = useState<'A' | 'B' | null>(null);

  // Select correct dataset
  const allData = type === 'offense' ? allOffenseData : allDefenseData;
  
  // Transform data based on display mode.
  // Rank by displayed values: per-game averages in per-game mode, totals in total
  // mode. Memoized so per-game math over all 32 teams doesn't re-run every render.
  const transformedAllData = useMemo(
    () => transformAllData(allData),
    [transformAllData, allData],
  );
  const transformedTeamAData = useMemo(
    () => transformTeamData(teamAData),
    [transformTeamData, teamAData],
  );
  const transformedTeamBData = useMemo(
    () => transformTeamData(teamBData),
    [transformTeamData, teamBData],
  );
  
  // Handle team change from ranking dropdown (stable identity so memoized rows
  // don't re-render on unrelated local state changes).
  const handleTeamAChange = useCallback((teamName: string) => {
    if (onTeamAChange) onTeamAChange(teamName);
    setActiveDropdown(null);
    setActiveTeamSelector(null);
  }, [onTeamAChange]);
  
  const handleTeamBChange = useCallback((teamName: string) => {
    if (onTeamBChange) onTeamBChange(teamName);
    setActiveDropdown(null);
    setActiveTeamSelector(null);
  }, [onTeamBChange]);
  
  // Handle rank click to open dropdown
  const handleRankClick = (metricKey: string, team: 'A' | 'B') => {
    setActiveTeamSelector(null); // Close team selector
    const current = activeDropdown;
    if (current?.metricKey === metricKey && current?.team === team) {
      // Close if same dropdown clicked
      setActiveDropdown(null);
    } else {
      // Open new dropdown
      setActiveDropdown({ metricKey, team });
    }
  };
  
  // Handle logo click to open team selector
  const handleLogoClick = (team: 'A' | 'B') => {
    setActiveDropdown(null); // Close ranking dropdown
    if (activeTeamSelector === team) {
      setActiveTeamSelector(null);
    } else {
      setActiveTeamSelector(team);
    }
  };
  
  return (
    <div 
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)'
      }}
    >
      {/* Panel Header - 70px */}
      <CompactPanelHeader
        type={type}
        teamA={teamA}
        teamB={teamB}
        displayMode={mode}
        onDisplayModeChange={setMode}
        activeTeamSelector={activeTeamSelector}
        onTeamAClick={() => handleLogoClick('A')}
        onTeamBClick={() => handleLogoClick('B')}
        onTeamAChange={handleTeamAChange}
        onTeamBChange={handleTeamBChange}
        allData={allData}
      />
      
      {/* Metric Rows - tight, theScore-style density with subtle dividers */}
      <div className="divide-y divide-white/5">
        {selectedMetrics.map((metricKey, index) => (
          <CompactComparisonRow
            key={metricKey}
            metricField={metricKey}
            teamA={teamA}
            teamB={teamB}
            teamAData={transformedTeamAData}
            teamBData={transformedTeamBData}
            allData={transformedAllData}
            panelType={type}
            displayMode={mode}
            activeDropdownTeam={activeDropdown?.metricKey === metricKey ? activeDropdown.team : null}
            onTeamAChange={handleTeamAChange}
            onTeamBChange={handleTeamBChange}
            onDropdownToggle={(team) => {
              if (activeDropdown?.metricKey === metricKey && activeDropdown?.team === team) {
                setActiveDropdown(null);
              } else {
                setActiveDropdown({ metricKey, team });
                setActiveTeamSelector(null); // Close team selector
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(CompactPanel);


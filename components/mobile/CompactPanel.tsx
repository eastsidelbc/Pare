/**
 * Compact Panel
 * 
 * Complete panel with rows (offense or defense)
 * LAYOUT: theScore compact structure (70px header + 48px rows = ~310px for 5 metrics)
 * STYLE: Pare visual design (purple accents, borderless, rounded)
 */

'use client';

import { useState, useEffect } from 'react';
import type { TeamData } from '@/lib/useNflStats';
import { useDisplayMode } from '@/lib/useDisplayMode';
import CompactPanelHeader from './CompactPanelHeader';
import CompactComparisonRow from './CompactComparisonRow';
import CompactRankingDropdown from './CompactRankingDropdown';
import CompactTeamSelector from './CompactTeamSelector';
import { d, traceStateChange } from '@/debug/traceDropdown';

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

export default function CompactPanel({
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

  // DEBUG: Trace state changes
  useEffect(() => {
    d(`CompactPanel[${type}]:activeDropdown`, activeDropdown);
  }, [activeDropdown, type]);

  useEffect(() => {
    d(`CompactPanel[${type}]:activeTeamSelector`, activeTeamSelector);
  }, [activeTeamSelector, type]);
  
  // Select correct dataset
  const allData = type === 'offense' ? allOffenseData : allDefenseData;
  
  // Transform data based on display mode
  const transformedAllData = transformAllData(allData);
  const transformedTeamAData = transformTeamData(teamAData);
  const transformedTeamBData = transformTeamData(teamBData);
  
  // Handle team change from ranking dropdown
  const handleTeamAChange = (teamName: string) => {
    if (onTeamAChange) onTeamAChange(teamName);
    setActiveDropdown(null);
    setActiveTeamSelector(null);
  };
  
  const handleTeamBChange = (teamName: string) => {
    if (onTeamBChange) onTeamBChange(teamName);
    setActiveDropdown(null);
    setActiveTeamSelector(null);
  };
  
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
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(139, 92, 246, 0.2)'
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
      
      {/* Metric Rows - 48px each */}
      <div>
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


/**
 * Compact Panel
 * 
 * Complete panel with rows (offense or defense)
 * LAYOUT: 28px slim header + ~48px rows (5 metrics ≈ 270px)
 * STYLE: Neon Frame (Round 5 "R") — team-color fading frame + deep card gradient
 * EFFECT: Power Surge — <StormCrackle> on a team's half when it's top 5 in ≥ 3 metrics
 */

'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import type { TeamData } from '@/lib/useNflStats';
import { useDisplayMode } from '@/lib/useDisplayMode';
import CompactPanelHeader from './CompactPanelHeader';
import CompactComparisonRow from './CompactComparisonRow';
import { getMatchupPalettes } from '@/lib/teamColors';
import { usePowerSurge } from '@/lib/usePowerSurge';
import StormCrackle from '@/components/ui/StormCrackle';

interface CompactPanelProps {
  type: 'offense' | 'defense';
  teamA: string;
  teamB: string;
  teamAData: TeamData | null;
  teamBData: TeamData | null;
  teamARecord?: string | null;
  teamBRecord?: string | null;
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
  }, [onTeamAChange]);
  
  const handleTeamBChange = useCallback((teamName: string) => {
    if (onTeamBChange) onTeamBChange(teamName);
    setActiveDropdown(null);
  }, [onTeamBChange]);

  // Stable menu handlers (useCallback) so memoized rows don't ALL re-render when
  // one menu opens. Before, an inline arrow here gave every row a new prop on
  // every panel render → opening one badge re-rendered all 10 rows.
  const handleDropdownToggle = useCallback((metricKey: string, team: 'A' | 'B') => {
    setActiveDropdown((cur) =>
      cur?.metricKey === metricKey && cur.team === team ? null : { metricKey, team },
    );
  }, []);
  const closeDropdown = useCallback(() => setActiveDropdown(null), []);

  // Power Surge: a team ranked top 5 in ≥ 3 of this card's metrics gets the
  // storm-crackle effect on its half (same ranks/data as the row badges).
  const powered = usePowerSurge(transformedAllData, selectedMetrics, teamA, teamB, type);

  // Team bar colors for this matchup (lift / clash / fallback rules in lib/teamColors).
  const palettes = useMemo(() => getMatchupPalettes(teamA, teamB), [teamA, teamB]);

  // Neon frame (Round 5 "R"): 2px border that fades from team A's color →
  // neutral → team B's color, with each team's glow spilling off its side.
  // Glow strength matches Round 5 "S" (brighter than R): 2px frame, 34px / 34% side glows.
  const frameStyle = {
    padding: 2,
    borderRadius: 'var(--radius-xl)',
    background: `linear-gradient(90deg, ${palettes.a.line}, var(--frame-mid) 50%, ${palettes.b.line})`,
    boxShadow: `-12px 4px 34px rgba(${palettes.a.rgb}, 0.34), 12px 4px 34px rgba(${palettes.b.rgb}, 0.34), var(--shadow-pop)`,
  };

  return (
    <div style={frameStyle}>
      <div
        className="relative isolate overflow-hidden"
        style={{
          borderRadius: 'calc(var(--radius-xl) - 2px)',
          background: 'linear-gradient(90deg, var(--card-deep-a) 0%, var(--card-deep-mid) 50%, var(--card-deep-b) 100%)',
          boxShadow: 'inset 0 1px 0 color-mix(in srgb, var(--text) 6%, transparent)',
        }}
      >
      {powered.a && <StormCrackle side="a" rgb={palettes.a.rgb} />}
      {powered.b && <StormCrackle side="b" rgb={palettes.b.rgb} />}
      <div className="relative z-[1]">
      <CompactPanelHeader
        type={type}
        displayMode={mode}
        onDisplayModeChange={setMode}
      />
      
      {/* Metric Rows - tight, theScore-style density with subtle dividers */}
      <div className="divide-y divide-[var(--hairline)]">
        {selectedMetrics.map((metricKey) => (
          <CompactComparisonRow
            key={metricKey}
            metricField={metricKey}
            paletteA={palettes.a}
            paletteB={palettes.b}
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
            onDropdownToggle={handleDropdownToggle}
            onDropdownClose={closeDropdown}
          />
        ))}
      </div>
      </div>
      </div>
    </div>
  );
}

export default memo(CompactPanel);


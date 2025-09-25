/**
 * NFL Team Comparison Page
 * 
 * Implements the DYNAMIC dual-section comparison interface with customizable metrics.
 * Features visual comparison bars, team selection, metrics customization, and real-time data from PFR.
 */

'use client';

import { useState, useEffect } from 'react';
import { useNflStats } from '@/lib/useNflStats';
import { DEFAULT_OFFENSE_METRICS, DEFAULT_DEFENSE_METRICS } from '@/lib/metricsConfig';
import MetricsSelector from '@/components/MetricsSelector';
import DynamicComparisonRow from '@/components/DynamicComparisonRow';
import TeamLogo from '@/components/TeamLogo';

export default function ComparePage() {
  const { 
    offenseData, 
    defenseData, 
    isLoading,
    isLoadingOffense, 
    isLoadingDefense, 
    offenseError, 
    defenseError,
    lastUpdated 
  } = useNflStats();

  // Team selection state
  const [selectedTeamA, setSelectedTeamA] = useState<string>('');
  const [selectedTeamB, setSelectedTeamB] = useState<string>('');
  
  // Dynamic metrics selection state
  const [selectedOffenseMetrics, setSelectedOffenseMetrics] = useState<string[]>(DEFAULT_OFFENSE_METRICS);
  const [selectedDefenseMetrics, setSelectedDefenseMetrics] = useState<string[]>(DEFAULT_DEFENSE_METRICS);
  
  // UI customization state
  const [showMetricsCustomization, setShowMetricsCustomization] = useState(false);
  
  // Display mode state (total vs per-game)
  const [offenseDisplayMode, setOffenseDisplayMode] = useState<'total' | 'per-game'>('per-game');
  const [defenseDisplayMode, setDefenseDisplayMode] = useState<'total' | 'per-game'>('per-game');

  // Auto-select teams when data loads
  useEffect(() => {
    if (offenseData.length > 0 && !selectedTeamA && !selectedTeamB) {
      const teamA = offenseData[0]?.team || '';
      const teamB = offenseData[1]?.team || '';
      
      console.log('🏈 [COMPARE-PAGE] Auto-selecting teams:', {
        teamA,
        teamB,
        totalTeams: offenseData.length
      });
      
      setSelectedTeamA(teamA);
      setSelectedTeamB(teamB);
    }
  }, [offenseData, selectedTeamA, selectedTeamB]);

  // Get team data
  const teamAOffense = offenseData.find(team => team.team === selectedTeamA);
  const teamBOffense = offenseData.find(team => team.team === selectedTeamB);
  
  // Function to calculate per-game stats
  const calculatePerGameStats = (teamData: any, mode: 'total' | 'per-game') => {
    if (mode === 'total' || !teamData?.g) return teamData;
    
    const games = parseFloat(teamData.g) || 1;
    const perGameData = { ...teamData };
    
    // Convert numeric stats to per-game (excluding ranks, team, g, and percentage stats)
    Object.keys(perGameData).forEach(key => {
      if (key !== 'team' && key !== 'g' && key !== 'ranks' && !key.includes('Rank') && 
          !key.includes('pct') && !key.includes('per') && perGameData[key]) {
        const value = parseFloat(perGameData[key]);
        if (!isNaN(value)) {
          perGameData[key] = (value / games).toFixed(1);
        }
      }
    });
    
    return perGameData;
  };
  
  // Apply display mode transformations
  const teamAOffenseDisplay = calculatePerGameStats(teamAOffense, offenseDisplayMode);
  const teamBOffenseDisplay = calculatePerGameStats(teamBOffense, offenseDisplayMode);
  
  const teamADefense = defenseData.find(team => team.team === selectedTeamA);
  const teamBDefense = defenseData.find(team => team.team === selectedTeamB);
  const teamADefenseDisplay = calculatePerGameStats(teamADefense, defenseDisplayMode);
  const teamBDefenseDisplay = calculatePerGameStats(teamBDefense, defenseDisplayMode);

  // Function to sort teams alphabetically with special entries at bottom
  const sortTeamsForDropdown = (teams: any[]) => {
    const specialTeams = ['Avg Team', 'League Total', 'Avg/TmG'];
    
    // Separate regular teams from special teams
    const regularTeams = teams.filter(team => !specialTeams.includes(team.team));
    const specialTeamEntries = teams.filter(team => specialTeams.includes(team.team));
    
    // Sort regular teams alphabetically
    const sortedRegularTeams = regularTeams.sort((a, b) => a.team.localeCompare(b.team));
    
    // Combine sorted regular teams with special teams at the end
    return [...sortedRegularTeams, ...specialTeamEntries];
  };

  // Loading state
  if (isLoading) {
    console.log('⏳ [COMPARE-PAGE] Displaying loading state:', {
      isLoadingOffense,
      isLoadingDefense,
      timestamp: new Date().toISOString()
    });
    
    return (
      <div className="min-h-screen w-screen bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#1e293b] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-xl text-slate-300">Loading NFL team data...</p>
          <div className="mt-4 text-sm text-slate-400 space-y-1">
            <p>Offense: {isLoadingOffense ? '⏳ Loading...' : '✅ Ready'}</p>
            <p>Defense: {isLoadingDefense ? '⏳ Loading...' : '✅ Ready'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (offenseError || defenseError) {
    console.error('🚨 [COMPARE-PAGE] Displaying error state:', {
      offenseError,
      defenseError,
      timestamp: new Date().toISOString()
    });
    
    return (
      <div className="min-h-screen w-screen bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#1e293b] text-white flex items-center justify-center">
        <div className="text-center max-w-4xl mx-auto px-6">
          <h1 className="text-4xl font-bold text-red-400 mb-6">⚠️ Error Loading NFL Data</h1>
          
          <div className="space-y-6">
            {/* Primary Error Message */}
            <div className="bg-red-900/20 border border-red-400/30 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-300 mb-3">Error Details</h2>
              <div className="text-left space-y-2">
                {offenseError && (
                  <div>
                    <span className="text-red-400 font-medium">Offense API:</span>
                    <p className="text-slate-300 text-sm mt-1">{offenseError}</p>
                  </div>
                )}
                {defenseError && (
                  <div>
                    <span className="text-red-400 font-medium">Defense API:</span>
                    <p className="text-slate-300 text-sm mt-1">{defenseError}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Debugging Information */}
            <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Debugging Information</h3>
              <div className="text-left text-sm text-slate-400 space-y-2">
                <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
                <p><strong>URL:</strong> {window.location.href}</p>
                <p><strong>User Agent:</strong> {navigator.userAgent}</p>
                <p><strong>Network:</strong> {navigator.onLine ? 'Online' : 'Offline'}</p>
              </div>
            </div>
            
            {/* Troubleshooting Steps */}
            <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-300 mb-3">Troubleshooting Steps</h3>
              <div className="text-left text-sm text-slate-300 space-y-2">
                <p>1. Check the browser console for detailed error logs</p>
                <p>2. Verify internet connection and firewall settings</p>
                <p>3. Try refreshing the page or clearing browser cache</p>
                <p>4. Check if Pro Football Reference is accessible</p>
                <p>5. Look at server logs if self-hosting</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 space-x-4">
            <button 
              onClick={() => {
                console.log('🔄 [COMPARE-PAGE] User triggered manual refresh');
                window.location.reload();
              }} 
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🔄 Retry
            </button>
            <button 
              onClick={() => {
                console.log('📊 [COMPARE-PAGE] User opened console');
                alert('Press F12 to open developer console and check for detailed error logs');
              }} 
              className="bg-slate-600 hover:bg-slate-700 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🔍 View Console
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#1e293b] text-white px-6 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-sans text-slate-100 mb-4">
            Pare: <span className="text-blue-400">NFL Team Comparison</span>
          </h1>
          {lastUpdated && (
            <p className="text-slate-400 text-sm">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>

        {/* Team Selection & Customization Controls */}
        <div className="bg-white/5 backdrop-blur-2xl border border-blue-400/20 rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-4 gap-6 items-center">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Team A</label>
              <select
                value={selectedTeamA}
                onChange={(e) => {
                  console.log('🏈 [COMPARE-PAGE] Team A changed to:', e.target.value);
                  setSelectedTeamA(e.target.value);
                }}
                className="w-full bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-400 focus:outline-none"
              >
                {sortTeamsForDropdown(offenseData).map((team) => (
                  <option key={team.team} value={team.team}>
                    {team.team}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="text-center">
              <span className="text-2xl font-bold text-slate-300">VS</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Team B</label>
              <select
                value={selectedTeamB}
                onChange={(e) => {
                  console.log('🏈 [COMPARE-PAGE] Team B changed to:', e.target.value);
                  setSelectedTeamB(e.target.value);
                }}
                className="w-full bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-400 focus:outline-none"
              >
                {sortTeamsForDropdown(offenseData).map((team) => (
                  <option key={team.team} value={team.team}>
                    {team.team}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => {
                  console.log('🎛️ [COMPARE-PAGE] Toggling metrics customization');
                  setShowMetricsCustomization(!showMetricsCustomization);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  showMetricsCustomization
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                🎛️ Customize
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Customization Panel */}
        {showMetricsCustomization && (
          <div className="mb-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-200 mb-4">
                🎛️ Customize Your Comparison Metrics
              </h2>
              <p className="text-slate-400 mb-6">
                Pick any metrics from Pro Football Reference data. Changes apply instantly!
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <MetricsSelector
                type="offense"
                selectedMetrics={selectedOffenseMetrics}
                onMetricsChange={(metrics) => {
                  console.log('🏈 [COMPARE-PAGE] Offense metrics changed:', metrics);
                  setSelectedOffenseMetrics(metrics);
                }}
                maxMetrics={99}
              />
              
              <MetricsSelector
                type="defense"
                selectedMetrics={selectedDefenseMetrics}
                onMetricsChange={(metrics) => {
                  console.log('🛡️ [COMPARE-PAGE] Defense metrics changed:', metrics);
                  setSelectedDefenseMetrics(metrics);
                }}
                maxMetrics={99}
              />
            </div>
          </div>
        )}

        {/* Dual-Section Comparison - Side by Side */}
        <div className="grid grid-cols-2 gap-6 max-w-7xl mx-auto">
          {/* Optimized Offense Panel */}
          <div className="bg-slate-900/90 border border-slate-700/50 rounded-2xl p-6 shadow-lg relative">
            
            {/* Header Row - Logos, Title, and Dropdown */}
            <div className="flex items-center justify-between mb-6 px-2">
              {/* Left Logo */}
              <TeamLogo teamName={selectedTeamA} size="60" />
              
              {/* Center Content - Title and Dropdown */}
              <div className="flex flex-col items-center gap-3">
                <h2 className="text-xl font-bold text-purple-400 tracking-tight">
                  Offense 
                </h2>
                <select 
                  value={offenseDisplayMode}
                  onChange={(e) => setOffenseDisplayMode(e.target.value as 'total' | 'per-game')}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200 font-medium text-xs focus:outline-none focus:border-slate-500 transition-colors duration-200"
                >
                  <option value="per-game">PER GAME</option>
                  <option value="total">TOTAL</option>
                </select>
              </div>
              
              {/* Right Logo */}
              <TeamLogo teamName={selectedTeamB} size="60" />
            </div>
            
            {teamAOffenseDisplay && teamBOffenseDisplay && (
              <div className="space-y-4">
                {selectedOffenseMetrics.map((metricKey) => (
                  <DynamicComparisonRow
                    key={metricKey}
                    metricKey={metricKey}
                    teamAData={teamAOffenseDisplay}
                    teamBData={teamBOffenseDisplay}
                    type="offense"
                    allOffenseData={offenseData}
                    allDefenseData={defenseData}
                  />
                ))}
                
                {selectedOffenseMetrics.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <p>No offense metrics selected.</p>
                    <p className="text-sm mt-2">Click &quot;🎛️ Customize&quot; to add metrics.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Optimized Defense Panel */}
          <div className="bg-slate-900/90 border border-slate-700/50 rounded-2xl p-6 shadow-lg relative">
            
            {/* Header Row - Logos, Title, and Dropdown */}
            <div className="flex items-center justify-between mb-6 px-2">
              {/* Left Logo */}
              <TeamLogo teamName={selectedTeamA} size="60" />
              
              {/* Center Content - Title and Dropdown */}
              <div className="flex flex-col items-center gap-3">
                <h2 className="text-xl font-bold text-purple-400 tracking-tight">
                  Defense 
                </h2>
                <select 
                  value={defenseDisplayMode}
                  onChange={(e) => setDefenseDisplayMode(e.target.value as 'total' | 'per-game')}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200 font-medium text-xs focus:outline-none focus:border-slate-500 transition-colors duration-200"
                >
                  <option value="per-game">PER GAME</option>
                  <option value="total">TOTAL</option>
                </select>
              </div>
              
              {/* Right Logo */}
              <TeamLogo teamName={selectedTeamB} size="60" />
            </div>
            
            {teamADefenseDisplay && teamBDefenseDisplay && (
              <div className="space-y-4">
                {selectedDefenseMetrics.map((metricKey) => (
                  <DynamicComparisonRow
                    key={metricKey}
                    metricKey={metricKey}
                    teamAData={teamADefenseDisplay}
                    teamBData={teamBDefenseDisplay}
                    type="defense"
                    allOffenseData={offenseData}
                    allDefenseData={defenseData}
                  />
                ))}
                
                {selectedDefenseMetrics.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <p>No defense metrics selected.</p>
                    <p className="text-sm mt-2">Click &quot;🎛️ Customize&quot; to add metrics.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 🎉 The old hardcoded ComparisonRow is now replaced by DynamicComparisonRow!
// This gives users total control over their metrics selection.

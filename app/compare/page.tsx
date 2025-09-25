/**
 * NFL Team Comparison Page - REFACTORED
 * 
 * Clean, professional comparison interface using extracted components.
 * Features self-contained panels with complete team selection and metrics customization.
 */

'use client';

import { useState } from 'react';
import { useNflStats } from '@/lib/useNflStats';
import { DEFAULT_OFFENSE_METRICS, DEFAULT_DEFENSE_METRICS } from '@/lib/metricsConfig';
import TeamSelectionPanel from '@/components/TeamSelectionPanel';
import OffensePanel from '@/components/OffensePanel';
import DefensePanel from '@/components/DefensePanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

  // Global team selection state
  const [selectedTeamA, setSelectedTeamA] = useState<string>('');
  const [selectedTeamB, setSelectedTeamB] = useState<string>('');

  // Global metrics selection state
  const [selectedOffenseMetrics, setSelectedOffenseMetrics] = useState<string[]>(DEFAULT_OFFENSE_METRICS);
  const [selectedDefenseMetrics, setSelectedDefenseMetrics] = useState<string[]>(DEFAULT_DEFENSE_METRICS);

  const handleTeamChange = (teamA: string, teamB: string) => {
    setSelectedTeamA(teamA);
    setSelectedTeamB(teamB);
  };

  console.log('🏈 [COMPARE-PAGE] Data loaded:', {
    offenseTeams: offenseData.length,
    defenseTeams: defenseData.length,
    selectedTeams: `${selectedTeamA} vs ${selectedTeamB}`,
    offenseMetrics: selectedOffenseMetrics.length,
    defenseMetrics: selectedDefenseMetrics.length,
    isLoading,
    hasErrors: !!(offenseError || defenseError)
  });

  // Show error state if data fails to load
  if (offenseError || defenseError) {
    return (
      <div className="min-h-screen w-screen bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#1e293b] text-white px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-red-400 mb-6">
            ⚠️ Data Loading Error
          </h1>
          
          <div className="bg-slate-900/90 rounded-xl border border-red-500/50 p-8 space-y-6">
            <p className="text-slate-300 text-lg">
              Unable to load NFL team data. Please check the API connection.
            </p>
            
            <div className="text-left space-y-4">
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
            </div>
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

        {/* Global Team Selection Panel */}
        <TeamSelectionPanel
          offenseData={offenseData}
          defenseData={defenseData}
          onTeamChange={handleTeamChange}
          selectedOffenseMetrics={selectedOffenseMetrics}
          selectedDefenseMetrics={selectedDefenseMetrics}
          onOffenseMetricsChange={setSelectedOffenseMetrics}
          onDefenseMetricsChange={setSelectedDefenseMetrics}
          isLoading={isLoading}
          className="mb-8"
        />


        {/* Comparison Panels - Protected by Error Boundaries */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Offense Panel */}
          <ErrorBoundary fallback={
            <div className="p-8 bg-slate-900/90 rounded-xl border border-red-500/30 text-center">
              <div className="text-red-400 text-4xl mb-2">⚠️</div>
              <h3 className="text-lg font-bold text-red-400">Offense Panel Error</h3>
              <p className="text-slate-400 mt-2">Unable to load offense comparison data</p>
            </div>
          }>
            <OffensePanel
              offenseData={offenseData}
              defenseData={defenseData}
              selectedTeamA={selectedTeamA}
              selectedTeamB={selectedTeamB}
              selectedMetrics={selectedOffenseMetrics}
              isLoading={isLoadingOffense}
            />
          </ErrorBoundary>

          {/* Defense Panel */}
          <ErrorBoundary fallback={
            <div className="p-8 bg-slate-900/90 rounded-xl border border-red-500/30 text-center">
              <div className="text-red-400 text-4xl mb-2">⚠️</div>
              <h3 className="text-lg font-bold text-red-400">Defense Panel Error</h3>
              <p className="text-slate-400 mt-2">Unable to load defense comparison data</p>
            </div>
          }>
            <DefensePanel
              defenseData={defenseData}
              offenseData={offenseData}
              selectedTeamA={selectedTeamA}
              selectedTeamB={selectedTeamB}
              selectedMetrics={selectedDefenseMetrics}
              isLoading={isLoadingDefense}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
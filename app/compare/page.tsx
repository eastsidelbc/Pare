/**
 * NFL Team Comparison Page - REFACTORED
 * 
 * Clean, professional comparison interface using extracted components.
 * Features self-contained panels with complete team selection and metrics customization.
 */

'use client';

import React, { useState } from 'react';
import { useNflStats } from '@/lib/useNflStats';
import { DEFAULT_OFFENSE_METRICS, DEFAULT_DEFENSE_METRICS } from '@/lib/metricsConfig';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import MobileCompareLayout from '@/components/mobile/MobileCompareLayout';
import OffensePanel from '@/components/OffensePanel';
import DefensePanel from '@/components/DefensePanel';
import FloatingMetricsButton from '@/components/FloatingMetricsButton';
import OfflineStatusBanner from '@/components/OfflineStatusBanner';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import CompareHeader from '@/components/CompareHeader';
import MismatchChips from '@/components/MismatchChips';

export default function ComparePage() {
  // NEW: Mobile detection
  const isMobile = useIsMobile();
  
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

  // Global team selection state (deterministic defaults)
  const defaultTeams = React.useMemo(() => {
    const specialTeams = ['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'];
    const availableTeams = offenseData.filter(team => !specialTeams.includes(team.team));
    if (availableTeams.length < 2) return { a: '', b: '' };
    const preferredTeamA = 'Minnesota Vikings';
    const preferredTeamB = 'Detroit Lions';
    const a = availableTeams.find(t => t.team === preferredTeamA)?.team || availableTeams[0]?.team || '';
    const b = availableTeams.find(t => t.team === preferredTeamB && t.team !== a)?.team || availableTeams.find(t => t.team !== a)?.team || '';
    return { a, b };
  }, [offenseData]);

  const [selectedTeamA, setSelectedTeamA] = useState<string>(() => defaultTeams.a);
  const [selectedTeamB, setSelectedTeamB] = useState<string>(() => defaultTeams.b);

  // Global metrics selection state
  const [selectedOffenseMetrics, setSelectedOffenseMetrics] = useState<string[]>(DEFAULT_OFFENSE_METRICS);
  const [selectedDefenseMetrics, setSelectedDefenseMetrics] = useState<string[]>(DEFAULT_DEFENSE_METRICS);

  // Validation-only: ensure selections remain valid when data changes
  React.useEffect(() => {
    if (offenseData.length === 0) return;
    if (!selectedTeamA || !offenseData.some(t => t.team === selectedTeamA)) {
      if (defaultTeams.a) setSelectedTeamA(defaultTeams.a);
    }
    if (!selectedTeamB || !offenseData.some(t => t.team === selectedTeamB)) {
      if (defaultTeams.b) setSelectedTeamB(defaultTeams.b);
    }
  }, [offenseData, selectedTeamA, selectedTeamB, defaultTeams]);

  // Individual team change handlers for dropdowns
  const handleTeamAChange = (newTeamA: string) => {
    console.log(`🚀 [COMPARE-PAGE] handleTeamAChange called with: ${newTeamA}`);
    setSelectedTeamA(newTeamA);
  };

  const handleTeamBChange = (newTeamB: string) => {
    console.log(`🚀 [COMPARE-PAGE] handleTeamBChange called with: ${newTeamB}`);
    setSelectedTeamB(newTeamB);
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

  // Mobile Performance Monitoring
  React.useEffect(() => {
    if (typeof window !== 'undefined' && !isLoading) {
      const isMobile = window.innerWidth <= 768;
      const connection = (navigator as any).connection;
      
      if (isMobile) {
        console.log('📱 [MOBILE-PERFORMANCE]:', {
          viewport: `${window.innerWidth}×${window.innerHeight}`,
          devicePixelRatio: window.devicePixelRatio,
          connection: connection?.effectiveType || 'unknown',
          memory: (navigator as any).deviceMemory || 'unknown',
          dataLoaded: {
            offense: offenseData.length,
            defense: defenseData.length
          },
          timestamp: new Date().toISOString()
        });
        
        // Performance timing
        if (performance.getEntriesByType) {
          const paintEntries = performance.getEntriesByType('paint');
          paintEntries.forEach(entry => {
            console.log(`🎨 [MOBILE-PAINT] ${entry.name}: ${entry.startTime.toFixed(2)}ms`);
          });
        }
      }
    }
  }, [isLoading, offenseData.length, defenseData.length]);

  // Show error state if data fails to load
  if (offenseError || defenseError) {
    return (
      <div className="min-h-screen-dynamic w-full bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#1e293b] text-white px-4 sm:px-6 py-safe-top pb-safe-bottom pt-12">
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
    <>
      {/* NEW: Conditional rendering based on viewport */}
      {isMobile ? (
        // ========================================
        // MOBILE LAYOUT (NEW)
        // ========================================
        <MobileCompareLayout
          selectedTeamA={selectedTeamA}
          selectedTeamB={selectedTeamB}
          onTeamAChange={handleTeamAChange}
          onTeamBChange={handleTeamBChange}
          offenseData={offenseData}
          defenseData={defenseData}
          selectedOffenseMetrics={selectedOffenseMetrics}
          selectedDefenseMetrics={selectedDefenseMetrics}
          onOffenseMetricsChange={setSelectedOffenseMetrics}
          onDefenseMetricsChange={setSelectedDefenseMetrics}
          isLoading={isLoading}
        />
      ) : (
        // ========================================
        // DESKTOP LAYOUT (EXISTING - ZERO CHANGES)
        // ========================================
        <>
          {/* Offline Status Banner */}
          <OfflineStatusBanner />
          
          <div className="min-h-screen-dynamic w-full relative text-white px-4 sm:px-6 py-safe-top pb-safe-bottom pt-4">
            {/* Premium Steel-Blue Multi-Layer Gradient (Original: #0b1120 → #0f172a → #1e293b) */}
            <div className="fixed inset-0 -z-10">
              {/* Base gradient - Steel blue shades (darker to lighter) */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#070d16] via-[#0b1120] to-[#1e293b]"></div>
              {/* Navy blue radial glow (top right) - matches original blue tone */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#0b1120]/60 via-[#0f172a]/30 to-transparent"></div>
              {/* Slate steel radial glow (bottom left) - darker steel accent */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#0f172a]/50 via-[#1e293b]/25 to-transparent"></div>
              {/* Steel highlight (top center) - lighter steel accent */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,_var(--tw-gradient-stops))] from-[#1e293b]/40 via-transparent to-transparent"></div>
              {/* Noise texture for premium steel feel */}
              <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]"></div>
            </div>
            <div className="max-w-6xl mx-auto">
            {/* Phase 2: Compact header + chips */}
            <div className="mb-3 space-y-2">
              <CompareHeader />
              <MismatchChips />
            </div>
            {/* Comparison Panels - Protected by Error Boundaries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                      onTeamAChange={handleTeamAChange}
                      onTeamBChange={handleTeamBChange}
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
                      onTeamAChange={handleTeamAChange}
                      onTeamBChange={handleTeamBChange}
                    />
              </ErrorBoundary>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-800/50 mb-safe-bottom">
              <p className="text-slate-500 text-sm">
                Stay Locked
              </p>
            </div>

            {/* Floating Metrics Button */}
            <FloatingMetricsButton
              selectedOffenseMetrics={selectedOffenseMetrics}
              selectedDefenseMetrics={selectedDefenseMetrics}
              onOffenseMetricsChange={setSelectedOffenseMetrics}
              onDefenseMetricsChange={setSelectedDefenseMetrics}
            />
          </div>
        </div>
        
        {/* PWA Install Prompt - Disabled for now */}
        {/* <PWAInstallPrompt 
          onInstall={() => console.log('🎉 [PWA] App installed successfully!')}
          onDismiss={() => console.log('🙈 [PWA] Install prompt dismissed')}
        /> */}
        </>
      )}
    </>
  );
}
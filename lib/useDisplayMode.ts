/**
 * Display Mode Hook
 * 
 * Manages per-game vs total stats toggle and provides data transformation utilities.
 * Handles automatic per-game calculations and mode-specific data processing.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { TeamData } from '@/lib/useNflStats';

export type DisplayMode = 'per-game' | 'total';

export interface UseDisplayModeReturn {
  // Current mode
  mode: DisplayMode;
  
  // Mode setters
  setMode: (mode: DisplayMode) => void;
  toggleMode: () => void;
  
  // Data transformation
  transformTeamData: (teamData: TeamData | null) => TeamData | null;
  transformAllData: (allData: TeamData[]) => TeamData[];
  
  // Utilities
  isPerGameMode: boolean;
  isTotalMode: boolean;
  modeLabel: string;
}

/**
 * Custom hook for managing display mode (per-game vs total) and data transformation
 */
export function useDisplayMode(initialMode: DisplayMode = 'per-game'): UseDisplayModeReturn {
  
  const [mode, setMode] = useState<DisplayMode>(initialMode);

  console.log(`📊 [USE-DISPLAY-MODE] Current mode: ${mode}`);

  const toggleMode = useCallback(() => {
    const newMode = mode === 'per-game' ? 'total' : 'per-game';
    console.log(`📊 [USE-DISPLAY-MODE] Toggling from ${mode} to ${newMode}`);
    setMode(newMode);
  }, [mode]);

  // Check if a field should be converted for per-game calculation
  const shouldConvertField = useCallback((key: string, value: unknown): boolean => {
    if (typeof value !== 'string' && typeof value !== 'number') return false;
    if (key === 'team' || key === 'g') return false; // Never convert team name or games
    
    // Don't convert percentages, rates, or per-game stats
    const skipPatterns = ['pct', 'per', 'avg', 'rate', '%'];
    const keyLower = key.toLowerCase();
    
    return !skipPatterns.some(pattern => keyLower.includes(pattern));
  }, []);

  // Transform individual team data based on current mode
  const transformTeamData = useCallback((teamData: TeamData | null): TeamData | null => {
    if (!teamData) return null;
    if (mode === 'total') return teamData; // No transformation needed for total mode

    // Per-game mode: divide stats by games played
    const games = parseFloat(String(teamData.g || '1'));
    if (games <= 0) return teamData; // Safety check

    const transformed: TeamData = { ...teamData };

    // Convert eligible numeric fields to per-game
    Object.keys(teamData).forEach(key => {
      const value = teamData[key as keyof TeamData];
      
      if (shouldConvertField(key, value)) {
        const numValue = parseFloat(String(value));
        if (!isNaN(numValue)) {
          // @ts-ignore - Dynamic key assignment for per-game calculation
          transformed[key as keyof TeamData] = (numValue / games).toFixed(1);
        }
      }
    });

    return transformed;
  }, [mode, shouldConvertField]);

  // Transform array of team data
  const transformAllData = useCallback((allData: TeamData[]): TeamData[] => {
    return allData.map(teamData => transformTeamData(teamData)).filter(Boolean) as TeamData[];
  }, [transformTeamData]);

  // Computed values
  const isPerGameMode = mode === 'per-game';
  const isTotalMode = mode === 'total';
  const modeLabel = mode === 'per-game' ? 'PER GAME' : 'TOTAL';

  return {
    // Current mode
    mode,
    
    // Mode setters
    setMode,
    toggleMode,
    
    // Data transformation
    transformTeamData,
    transformAllData,
    
    // Utilities
    isPerGameMode,
    isTotalMode,
    modeLabel
  };
}

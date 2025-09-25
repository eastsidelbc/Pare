/**
 * Display Mode Hook
 * 
 * Manages per-game vs total stats toggle and provides data transformation utilities.
 * Handles automatic per-game calculations and mode-specific data processing.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { TeamData } from '@/lib/useNflStats';
import { transformTeamDataByMode, transformAllTeamDataByMode, type DisplayMode as TransformDisplayMode } from '@/utils/teamDataTransform';

export type DisplayMode = TransformDisplayMode;

export interface UseDisplayModeReturn {
  // Current mode
  mode: DisplayMode;
  
  // Mode setters
  setMode: (mode: DisplayMode) => void;
  toggleMode: () => void;
  
  // Data transformation (now using consolidated utility)
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

  // ✅ Transform individual team data using consolidated utility
  const transformTeamData = useCallback((teamData: TeamData | null): TeamData | null => {
    return transformTeamDataByMode(teamData, mode);
  }, [mode]);

  // ✅ Transform array of team data using consolidated utility
  const transformAllData = useCallback((allData: TeamData[]): TeamData[] => {
    return transformAllTeamDataByMode(allData, mode);
  }, [mode]);

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

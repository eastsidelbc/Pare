/**
 * Team Selection Hook
 * 
 * Manages team selection state and provides utilities for team comparison.
 * Handles auto-selection, team validation, and team data retrieval.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { isSpecialTeam } from '@/utils/helpers';
import { TeamData } from '@/lib/useNflStats';

export interface TeamSelectionOptions {
  autoSelectOnLoad?: boolean;
  allowSameTeam?: boolean;
  excludeSpecialTeams?: boolean;
  // NEW: External team state for syncing with global state
  currentTeamA?: string;
  currentTeamB?: string;
}

export interface UseTeamSelectionReturn {
  // Selected teams
  selectedTeamA: string;
  selectedTeamB: string;
  
  // Team selection functions
  setTeamA: (teamName: string) => void;
  setTeamB: (teamName: string) => void;
  swapTeams: () => void;
  resetSelection: () => void;
  
  // Team data retrieval
  getTeamAData: (data: TeamData[]) => TeamData | null;
  getTeamBData: (data: TeamData[]) => TeamData | null;
  
  // Validation
  isValidSelection: boolean;
  hasBothTeams: boolean;
  
  // Available teams (filtered)
  getAvailableTeams: (data: TeamData[]) => TeamData[];
}

/**
 * Custom hook for managing team selection in comparison interfaces
 */
export function useTeamSelection(
  offenseData: TeamData[] = [],
  defenseData: TeamData[] = [],
  options: TeamSelectionOptions = {}
): UseTeamSelectionReturn {
  
  const {
    autoSelectOnLoad = true,
    allowSameTeam = false,
    excludeSpecialTeams = true,
    currentTeamA = '',
    currentTeamB = ''
  } = options;

  // Team selection state
  const [selectedTeamA, setSelectedTeamA] = useState<string>('');
  const [selectedTeamB, setSelectedTeamB] = useState<string>('');

  console.log(`🏈 [USE-TEAM-SELECTION] Hook initialized with ${offenseData.length} offense teams, ${defenseData.length} defense teams`);

  // 🔧 FIX: Sync internal state with external state changes (from RankingDropdown)
  useEffect(() => {
    if (currentTeamA && currentTeamA !== selectedTeamA) {
      console.log(`🔄 [USE-TEAM-SELECTION] Syncing Team A: ${selectedTeamA} → ${currentTeamA}`);
      setSelectedTeamA(currentTeamA);
    }
    if (currentTeamB && currentTeamB !== selectedTeamB) {
      console.log(`🔄 [USE-TEAM-SELECTION] Syncing Team B: ${selectedTeamB} → ${currentTeamB}`);
      setSelectedTeamB(currentTeamB);
    }
  }, [currentTeamA, currentTeamB, selectedTeamA, selectedTeamB]);

  // Filter available teams (exclude special teams)
  const getAvailableTeams = useCallback((data: TeamData[]): TeamData[] => {
    if (!excludeSpecialTeams) return data;
    
    return data.filter(team => !isSpecialTeam(team.team));
  }, [excludeSpecialTeams]);

  // Auto-select teams when data loads
  useEffect(() => {
    if (!autoSelectOnLoad) return;
    if (offenseData.length === 0) return;
    if (selectedTeamA && selectedTeamB) return; // Already selected
    // 🔧 FIX: Don't auto-select if external state is provided
    if (currentTeamA || currentTeamB) return;

    const availableTeams = getAvailableTeams(offenseData);
    if (availableTeams.length >= 2) {
      // 🏈 DEFAULT TEAM SELECTION: Minnesota Vikings vs Detroit Lions
      const preferredTeamA = 'Minnesota Vikings';
      const preferredTeamB = 'Detroit Lions';
      
      // Try to find preferred teams, otherwise fall back to first available teams
      const teamA = availableTeams.find(team => team.team === preferredTeamA)?.team || 
                   availableTeams[0]?.team || '';
      const teamB = availableTeams.find(team => team.team === preferredTeamB && team.team !== teamA)?.team || 
                   availableTeams.find(team => team.team !== teamA)?.team || '';
      
      if (teamA && teamB) {
        console.log(`🏈 [USE-TEAM-SELECTION] Auto-selecting teams: ${teamA} vs ${teamB}`);
        setSelectedTeamA(teamA);
        setSelectedTeamB(teamB);
      }
    }
  }, [offenseData, autoSelectOnLoad, selectedTeamA, selectedTeamB, getAvailableTeams, currentTeamA, currentTeamB]);

  // Team selection functions
  const setTeamA = useCallback((teamName: string) => {
    console.log(`🏈 [USE-TEAM-SELECTION] Team A changed to: ${teamName}`);
    
    // If same team selection not allowed and teamName equals teamB, swap them
    if (!allowSameTeam && teamName === selectedTeamB && selectedTeamB) {
      console.log(`🏈 [USE-TEAM-SELECTION] Swapping teams to avoid duplicate`);
      setSelectedTeamB(selectedTeamA);
    }
    
    setSelectedTeamA(teamName);
  }, [selectedTeamA, selectedTeamB, allowSameTeam]);

  const setTeamB = useCallback((teamName: string) => {
    console.log(`🏈 [USE-TEAM-SELECTION] Team B changed to: ${teamName}`);
    
    // If same team selection not allowed and teamName equals teamA, swap them
    if (!allowSameTeam && teamName === selectedTeamA && selectedTeamA) {
      console.log(`🏈 [USE-TEAM-SELECTION] Swapping teams to avoid duplicate`);
      setSelectedTeamA(selectedTeamB);
    }
    
    setSelectedTeamB(teamName);
  }, [selectedTeamA, selectedTeamB, allowSameTeam]);

  const swapTeams = useCallback(() => {
    console.log(`🏈 [USE-TEAM-SELECTION] Swapping teams: ${selectedTeamA} ↔ ${selectedTeamB}`);
    const tempA = selectedTeamA;
    setSelectedTeamA(selectedTeamB);
    setSelectedTeamB(tempA);
  }, [selectedTeamA, selectedTeamB]);

  const resetSelection = useCallback(() => {
    console.log(`🏈 [USE-TEAM-SELECTION] Resetting team selection`);
    setSelectedTeamA('');
    setSelectedTeamB('');
  }, []);

  // Team data retrieval functions
  const getTeamAData = useCallback((data: TeamData[]): TeamData | null => {
    if (!selectedTeamA) return null;
    return data.find(team => team.team === selectedTeamA) || null;
  }, [selectedTeamA]);

  const getTeamBData = useCallback((data: TeamData[]): TeamData | null => {
    if (!selectedTeamB) return null;
    return data.find(team => team.team === selectedTeamB) || null;
  }, [selectedTeamB]);

  // Validation
  const isValidSelection = Boolean(selectedTeamA && selectedTeamB && (allowSameTeam || selectedTeamA !== selectedTeamB));
  const hasBothTeams = Boolean(selectedTeamA && selectedTeamB);

  return {
    // Selected teams
    selectedTeamA,
    selectedTeamB,
    
    // Team selection functions
    setTeamA,
    setTeamB,
    swapTeams,
    resetSelection,
    
    // Team data retrieval
    getTeamAData,
    getTeamBData,
    
    // Validation
    isValidSelection,
    hasBothTeams,
    
    // Available teams
    getAvailableTeams
  };
}

import { logDebug } from '@/lib/logger';

'use client';

import React from 'react';
import type { ScoreboardGame } from '@/types/matchup';

export interface SelectedGameSnapshot extends Partial<ScoreboardGame> {
  awayAbbr?: string;
  homeAbbr?: string;
}

interface SelectionContextValue {
  selectedGame: SelectedGameSnapshot | null;
  setSelectedGame: (g: SelectedGameSnapshot | null) => void;
  swap: boolean;
  toggleSwap: () => void;
}

const SelectionContext = React.createContext<SelectionContextValue | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedGame, setSelectedGame] = React.useState<SelectedGameSnapshot | null>(null);
  const [swap, setSwap] = React.useState(false);

  const toggleSwap = React.useCallback(() => setSwap(s => !s), []);

  React.useEffect(() => {
    logDebug('SelectionContext/update', { next: selectedGame });
  }, [selectedGame]);

  const value = React.useMemo(() => ({ selectedGame, setSelectedGame, swap, toggleSwap }), [selectedGame, swap, toggleSwap]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  const ctx = React.useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider');
  return ctx;
}



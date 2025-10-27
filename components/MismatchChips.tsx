'use client';

import React from 'react';
import { useSelection } from './SelectionContext';

interface Chip {
  id: string;
  text: string;
  severity: 'extreme' | 'high' | 'moderate';
}

function mockRules(): Chip[] {
  // Placeholder deterministic rules for Phase 2 visual
  return [
    { id: 'elite-offense-vs-poor-defense', text: 'Top-5 Offense vs Bottom-10 Defense', severity: 'extreme' },
    { id: 'rz-gap', text: 'RZ TD%: 68% vs 44%', severity: 'high' },
  ];
}

export default function MismatchChips() {
  const { selectedGame } = useSelection();
  const chips = React.useMemo(() => mockRules().slice(0, 2), [selectedGame]);

  if (!selectedGame?.awayAbbr || !selectedGame?.homeAbbr) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {chips.map((c) => (
        <span
          key={c.id}
          className={
            'inline-flex items-center h-7 rounded-full px-3 text-[12px] font-medium whitespace-nowrap border ' +
            (c.severity === 'extreme'
              ? 'bg-red-500/10 text-red-300 border-red-500/30'
              : c.severity === 'high'
              ? 'bg-orange-500/10 text-orange-300 border-orange-500/30'
              : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30')
          }
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}



'use client';

import { useMemo } from 'react';

export interface Preferences {
  // Placeholder: add fields when auth lands
  // For now, this hook simply provides responsive UI rules or defaults
  ui: {
    rankingDropdownMaxHeight: string; // tailwind class for max height
  };
}

export function usePreferences(): Preferences {
  // Stub: Provide UI-related preferences only (no persistence yet)
  return useMemo(() => ({
    ui: {
      rankingDropdownMaxHeight: 'max-h-[60vh] md:max-h-[500px]',
    },
  }), []);
}



/**
 * Mobile Detection Hook
 * 
 * Detects if viewport is mobile (<1024px)
 * Used for conditional rendering of mobile vs desktop layouts
 * 
 * LAYOUT: theScore compact structure
 * STYLE: Pare visual design
 *
 * PERF (Pass 3, 2026-10-03): reads the width with useSyncExternalStore instead
 * of useState(false) + useEffect. Before, EVERY mount first rendered as "not
 * mobile" and then corrected itself — on Compare that meant building the whole
 * iPad 2×2 grid, throwing it away and building the phone pager. Now client-side
 * mounts (e.g. Home → Compare) get the right answer on the first render. Only
 * the very first page load (hydration) still starts from the server's `false`,
 * which React must match, then switches before the user sees anything.
 */

'use client';

import { useCallback, useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

/**
 * Detects if viewport is mobile (<1024px)
 * Used for conditional rendering of mobile vs desktop layouts
 */
export function useIsMobile(breakpoint: number = 1024): boolean {
  const getSnapshot = useCallback(() => window.innerWidth < breakpoint, [breakpoint]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

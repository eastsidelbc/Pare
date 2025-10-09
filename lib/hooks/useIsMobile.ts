/**
 * Mobile Detection Hook
 * 
 * Detects if viewport is mobile (<1024px)
 * Used for conditional rendering of mobile vs desktop layouts
 * 
 * LAYOUT: theScore compact structure
 * STYLE: Pare visual design
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * Detects if viewport is mobile (<1024px)
 * Used for conditional rendering of mobile vs desktop layouts
 */
export function useIsMobile(breakpoint: number = 1024): boolean {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    
    // Check on mount
    checkMobile();
    
    // Check on resize
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);
  
  return isMobile;
}


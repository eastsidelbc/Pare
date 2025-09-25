/**
 * Theme and UI Customization Hook
 * 
 * Provides centralized theme management, color schemes, and UI customization.
 * Makes it easy to change colors, styling, and visual themes across the app.
 */

'use client';

import { useState, useCallback } from 'react';

// Color scheme definitions
export type ColorScheme = 'default' | 'dark' | 'light' | 'neon' | 'retro' | 'custom';

export interface TeamColors {
  teamA: {
    text: string;
    bar: string;
    gradient: string;
  };
  teamB: {
    text: string;
    bar: string;
    gradient: string;
  };
}

export interface ThemeConfig {
  colorScheme: ColorScheme;
  teamColors: TeamColors;
  panelStyle: 'sleek' | 'rounded' | 'sharp' | 'glass';
  barStyle: 'filled' | 'outlined' | 'gradient' | 'animated';
  shadows: 'none' | 'soft' | 'medium' | 'heavy';
  animations: boolean;
}

// Predefined color schemes
const COLOR_SCHEMES: Record<ColorScheme, TeamColors> = {
  default: {
    teamA: {
      text: 'text-green-400',
      bar: 'bg-green-500',
      gradient: 'linear-gradient(90deg, #22c55e, #16a34a)'
    },
    teamB: {
      text: 'text-orange-400',
      bar: 'bg-orange-500',
      gradient: 'linear-gradient(90deg, #f97316, #ea580c)'
    }
  },
  dark: {
    teamA: {
      text: 'text-slate-300',
      bar: 'bg-slate-600',
      gradient: 'linear-gradient(90deg, #475569, #334155)'
    },
    teamB: {
      text: 'text-slate-400',
      bar: 'bg-slate-700',
      gradient: 'linear-gradient(90deg, #334155, #1e293b)'
    }
  },
  light: {
    teamA: {
      text: 'text-blue-600',
      bar: 'bg-blue-500',
      gradient: 'linear-gradient(90deg, #3b82f6, #2563eb)'
    },
    teamB: {
      text: 'text-purple-600',
      bar: 'bg-purple-500',
      gradient: 'linear-gradient(90deg, #8b5cf6, #7c3aed)'
    }
  },
  neon: {
    teamA: {
      text: 'text-cyan-400',
      bar: 'bg-cyan-500',
      gradient: 'linear-gradient(90deg, #06b6d4, #0891b2)'
    },
    teamB: {
      text: 'text-pink-400',
      bar: 'bg-pink-500',
      gradient: 'linear-gradient(90deg, #ec4899, #db2777)'
    }
  },
  retro: {
    teamA: {
      text: 'text-yellow-400',
      bar: 'bg-yellow-500',
      gradient: 'linear-gradient(90deg, #eab308, #ca8a04)'
    },
    teamB: {
      text: 'text-red-400',
      bar: 'bg-red-500',
      gradient: 'linear-gradient(90deg, #ef4444, #dc2626)'
    }
  },
  custom: {
    teamA: {
      text: 'text-green-400',
      bar: 'bg-green-500',
      gradient: 'linear-gradient(90deg, #22c55e, #16a34a)'
    },
    teamB: {
      text: 'text-orange-400',
      bar: 'bg-orange-500',
      gradient: 'linear-gradient(90deg, #f97316, #ea580c)'
    }
  }
};

export interface UseThemeReturn {
  // Current theme
  theme: ThemeConfig;
  
  // Theme setters
  setColorScheme: (scheme: ColorScheme) => void;
  setPanelStyle: (style: ThemeConfig['panelStyle']) => void;
  setBarStyle: (style: ThemeConfig['barStyle']) => void;
  setShadows: (shadows: ThemeConfig['shadows']) => void;
  toggleAnimations: () => void;
  
  // Custom color setters
  setTeamAColors: (colors: Partial<TeamColors['teamA']>) => void;
  setTeamBColors: (colors: Partial<TeamColors['teamB']>) => void;
  
  // Utility functions
  getTeamAColor: () => string;
  getTeamBColor: () => string;
  getTeamABarColor: () => string;
  getTeamBBarColor: () => string;
  getTeamAGradient: () => string;
  getTeamBGradient: () => string;
  
  // Panel styling
  getPanelClasses: () => string;
  getBarContainerClasses: () => string;
  
  // Available options
  availableColorSchemes: ColorScheme[];
  availablePanelStyles: ThemeConfig['panelStyle'][];
  availableBarStyles: ThemeConfig['barStyle'][];
}

/**
 * Custom hook for theme and UI customization management
 */
export function useTheme(): UseThemeReturn {
  
  // Theme state
  const [theme, setTheme] = useState<ThemeConfig>({
    colorScheme: 'default',
    teamColors: COLOR_SCHEMES.default,
    panelStyle: 'sleek',
    barStyle: 'gradient',
    shadows: 'medium',
    animations: true
  });

  console.log(`🎨 [USE-THEME] Current theme:`, theme);

  // Color scheme setter
  const setColorScheme = useCallback((scheme: ColorScheme) => {
    console.log(`🎨 [USE-THEME] Changing color scheme to: ${scheme}`);
    setTheme(prev => ({
      ...prev,
      colorScheme: scheme,
      teamColors: COLOR_SCHEMES[scheme]
    }));
  }, []);

  // Style setters
  const setPanelStyle = useCallback((style: ThemeConfig['panelStyle']) => {
    console.log(`🎨 [USE-THEME] Changing panel style to: ${style}`);
    setTheme(prev => ({ ...prev, panelStyle: style }));
  }, []);

  const setBarStyle = useCallback((style: ThemeConfig['barStyle']) => {
    console.log(`🎨 [USE-THEME] Changing bar style to: ${style}`);
    setTheme(prev => ({ ...prev, barStyle: style }));
  }, []);

  const setShadows = useCallback((shadows: ThemeConfig['shadows']) => {
    console.log(`🎨 [USE-THEME] Changing shadows to: ${shadows}`);
    setTheme(prev => ({ ...prev, shadows }));
  }, []);

  const toggleAnimations = useCallback(() => {
    console.log(`🎨 [USE-THEME] Toggling animations`);
    setTheme(prev => ({ ...prev, animations: !prev.animations }));
  }, []);

  // Custom color setters
  const setTeamAColors = useCallback((colors: Partial<TeamColors['teamA']>) => {
    console.log(`🎨 [USE-THEME] Updating Team A colors:`, colors);
    setTheme(prev => ({
      ...prev,
      colorScheme: 'custom',
      teamColors: {
        ...prev.teamColors,
        teamA: { ...prev.teamColors.teamA, ...colors }
      }
    }));
  }, []);

  const setTeamBColors = useCallback((colors: Partial<TeamColors['teamB']>) => {
    console.log(`🎨 [USE-THEME] Updating Team B colors:`, colors);
    setTheme(prev => ({
      ...prev,
      colorScheme: 'custom',
      teamColors: {
        ...prev.teamColors,
        teamB: { ...prev.teamColors.teamB, ...colors }
      }
    }));
  }, []);

  // Utility functions
  const getTeamAColor = useCallback(() => theme.teamColors.teamA.text, [theme.teamColors.teamA.text]);
  const getTeamBColor = useCallback(() => theme.teamColors.teamB.text, [theme.teamColors.teamB.text]);
  const getTeamABarColor = useCallback(() => theme.teamColors.teamA.bar, [theme.teamColors.teamA.bar]);
  const getTeamBBarColor = useCallback(() => theme.teamColors.teamB.bar, [theme.teamColors.teamB.bar]);
  const getTeamAGradient = useCallback(() => theme.teamColors.teamA.gradient, [theme.teamColors.teamA.gradient]);
  const getTeamBGradient = useCallback(() => theme.teamColors.teamB.gradient, [theme.teamColors.teamB.gradient]);

  // Panel styling functions (using useCallback for proper function references)
  const getPanelClasses = useCallback(() => {
    const baseClasses = 'bg-slate-900/90 border border-slate-700/50';
    
    const styleClasses = {
      sleek: 'rounded-xl',
      rounded: 'rounded-2xl',
      sharp: 'rounded-none',
      glass: 'rounded-xl backdrop-blur-sm bg-slate-900/70'
    };

    const shadowClasses = {
      none: '',
      soft: 'shadow-sm',
      medium: 'shadow-lg',
      heavy: 'shadow-2xl shadow-black/50'
    };

    return `${baseClasses} ${styleClasses[theme.panelStyle]} ${shadowClasses[theme.shadows]}`;
  }, [theme.panelStyle, theme.shadows]);

  const getBarContainerClasses = useCallback(() => {
    const baseClasses = 'relative w-full h-5 bg-slate-800 overflow-hidden';
    
    const styleClasses = {
      sleek: 'rounded-full',
      rounded: 'rounded-lg',
      sharp: 'rounded-none',
      glass: 'rounded-full bg-slate-800/70'
    };

    return `${baseClasses} ${styleClasses[theme.panelStyle]}`;
  }, [theme.panelStyle]);

  // Available options
  const availableColorSchemes: ColorScheme[] = ['default', 'dark', 'light', 'neon', 'retro', 'custom'];
  const availablePanelStyles: ThemeConfig['panelStyle'][] = ['sleek', 'rounded', 'sharp', 'glass'];
  const availableBarStyles: ThemeConfig['barStyle'][] = ['filled', 'outlined', 'gradient', 'animated'];

  return {
    // Current theme
    theme,
    
    // Theme setters
    setColorScheme,
    setPanelStyle,
    setBarStyle,
    setShadows,
    toggleAnimations,
    
    // Custom color setters
    setTeamAColors,
    setTeamBColors,
    
    // Utility functions
    getTeamAColor,
    getTeamBColor,
    getTeamABarColor,
    getTeamBBarColor,
    getTeamAGradient,
    getTeamBGradient,
    
    // Panel styling
    getPanelClasses,
    getBarContainerClasses,
    
    // Available options
    availableColorSchemes,
    availablePanelStyles,
    availableBarStyles
  };
}

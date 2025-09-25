/**
 * Theme Customizer Component
 * 
 * Provides UI controls for customizing the app's visual theme.
 * Demonstrates how easy UI customization becomes with proper hooks.
 */

'use client';

import { useTheme } from '@/lib/useTheme';
import { useState } from 'react';

interface ThemeCustomizerProps {
  className?: string;
}

export default function ThemeCustomizer({ className = '' }: ThemeCustomizerProps) {
  const {
    theme,
    setColorScheme,
    setPanelStyle,
    setBarStyle,
    setShadows,
    toggleAnimations,
    availableColorSchemes,
    availablePanelStyles,
    availableBarStyles
  } = useTheme();

  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-6 right-6 z-50
          px-4 py-2
          bg-purple-600 hover:bg-purple-700
          text-white font-medium
          rounded-xl shadow-lg
          transition-all duration-200
          ${className}
        `}
      >
        🎨 Customize
      </button>
    );
  }

  return (
    <div className={`
      fixed bottom-6 right-6 z-50
      w-80 p-6
      bg-slate-900/95 backdrop-blur-sm
      border border-slate-700/50
      rounded-xl shadow-2xl
      ${className}
    `}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-200">
          🎨 Theme Customizer
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6">
        {/* Color Scheme */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Color Scheme
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availableColorSchemes.map((scheme) => (
              <button
                key={scheme}
                onClick={() => setColorScheme(scheme)}
                className={`
                  px-3 py-2 text-sm rounded-lg transition-all
                  ${theme.colorScheme === scheme
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }
                `}
              >
                {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Panel Style */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Panel Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availablePanelStyles.map((style) => (
              <button
                key={style}
                onClick={() => setPanelStyle(style)}
                className={`
                  px-3 py-2 text-sm rounded-lg transition-all
                  ${theme.panelStyle === style
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }
                `}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Bar Style */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Bar Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availableBarStyles.map((style) => (
              <button
                key={style}
                onClick={() => setBarStyle(style)}
                className={`
                  px-3 py-2 text-sm rounded-lg transition-all
                  ${theme.barStyle === style
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }
                `}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Shadows */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Shadow Intensity
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['none', 'soft', 'medium', 'heavy'] as const).map((shadow) => (
              <button
                key={shadow}
                onClick={() => setShadows(shadow)}
                className={`
                  px-3 py-2 text-sm rounded-lg transition-all
                  ${theme.shadows === shadow
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }
                `}
              >
                {shadow.charAt(0).toUpperCase() + shadow.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Animations Toggle */}
        <div>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">
              Animations
            </span>
            <button
              onClick={toggleAnimations}
              className={`
                relative w-12 h-6 rounded-full transition-colors
                ${theme.animations ? 'bg-purple-600' : 'bg-slate-700'}
              `}
            >
              <div className={`
                absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                ${theme.animations ? 'translate-x-7' : 'translate-x-1'}
              `} />
            </button>
          </label>
        </div>

        {/* Preview */}
        <div className="pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-3">Preview:</p>
          <div className={`w-full h-4 ${theme.teamColors.teamA.bar} rounded-full mb-2`} />
          <div className={`w-3/4 h-4 ${theme.teamColors.teamB.bar} rounded-full`} />
        </div>
      </div>
    </div>
  );
}

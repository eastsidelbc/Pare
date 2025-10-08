/**
 * Dynamic Metrics Selector Component
 * 
 * Allows users to customize which metrics they want to see in their comparison.
 * Shows friendly names with technical field names in parentheses.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { 
  AVAILABLE_METRICS, 
  getMetricsByCategory,
  DEFAULT_OFFENSE_METRICS,
  DEFAULT_DEFENSE_METRICS
} from '@/lib/metricsConfig';

interface MetricsSelectorProps {
  type: 'offense' | 'defense';
  selectedMetrics: string[];
  onMetricsChange: (metrics: string[]) => void;
  maxMetrics?: number;
  className?: string;
}

export default function MetricsSelector({ 
  type, 
  selectedMetrics, 
  onMetricsChange, 
  maxMetrics = 99,
  className = '' 
}: MetricsSelectorProps) {
  // Always show metrics (no expand/collapse needed)
  const isExpanded = true;
  
  // Phase 2.1: Memoize expensive category grouping (only recalculate when type changes)
  const metricsByCategory = useMemo(() => getMetricsByCategory(type), [type]);
  
  // Phase 2.1: Memoize available metric keys extraction
  const availableMetricKeys = useMemo(() => {
    return Object.keys(metricsByCategory).reduce((acc, category) => {
      return [...acc, ...Object.keys(metricsByCategory[category])];
    }, [] as string[]);
  }, [metricsByCategory]);

  // Phase 2.1: Wrap handlers in useCallback to prevent recreation on every render
  const handleAddMetric = useCallback((metricKey: string) => {
    if (!selectedMetrics.includes(metricKey) && selectedMetrics.length < maxMetrics) {
      onMetricsChange([...selectedMetrics, metricKey]);
    }
  }, [selectedMetrics, maxMetrics, onMetricsChange]);

  const handleRemoveMetric = useCallback((metricKey: string) => {
    onMetricsChange(selectedMetrics.filter(key => key !== metricKey));
  }, [selectedMetrics, onMetricsChange]);

  const handleToggleMetric = useCallback((metricKey: string) => {
    if (selectedMetrics.includes(metricKey)) {
      // Remove if already selected
      onMetricsChange(selectedMetrics.filter(key => key !== metricKey));
    } else if (selectedMetrics.length < maxMetrics) {
      // Add if not selected and under limit
      onMetricsChange([...selectedMetrics, metricKey]);
    }
  }, [selectedMetrics, maxMetrics, onMetricsChange]);

  const handleResetToDefaults = useCallback(() => {
    const defaults = type === 'offense' ? DEFAULT_OFFENSE_METRICS : DEFAULT_DEFENSE_METRICS;
    onMetricsChange(defaults);
  }, [type, onMetricsChange]);

  const handleAddOrClearAll = useCallback(() => {
    const allSelected = availableMetricKeys.every(key => selectedMetrics.includes(key));
    if (allSelected) {
      // Clear all
      onMetricsChange([]);
    } else {
      // Add all visible metrics (respecting maxMetrics limit)
      const newMetrics = [...new Set([...selectedMetrics, ...availableMetricKeys])];
      onMetricsChange(newMetrics.slice(0, maxMetrics));
    }
  }, [availableMetricKeys, selectedMetrics, maxMetrics, onMetricsChange]);


  // Get category emoji
  const getCategoryEmoji = (category: string): string => {
    const emojis: Record<string, string> = {
      'scoring': '🏆',
      'passing': '🎯', 
      'rushing': '💨',
      'efficiency': '⚡',
      'defense': '🛡️',
      'special': '🦵',
      'advanced': '🧮'
    };
    return emojis[category] || '📊';
  };

  // Phase 2.1: Memoize filtered available metrics
  const availableToAdd = useMemo(() => {
    return availableMetricKeys.filter(key => !selectedMetrics.includes(key));
  }, [availableMetricKeys, selectedMetrics]);
  
  // Phase 2.1: Memoize all-selected check
  const allMetricsSelected = useMemo(() => {
    return availableMetricKeys.every(key => selectedMetrics.includes(key));
  }, [availableMetricKeys, selectedMetrics]);

  // [Diagnostics] Log available/selected counts for quick comparison during reload modes
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // Keep lightweight; runs during render but only logs small objects
    console.log('[Diag:MetricsSelector] render', {
      type,
      availableCount: availableMetricKeys.length,
      selectedCount: selectedMetrics.length,
      maxMetrics
    });
  }

  return (
    <div className={`bg-slate-800/50 border border-slate-600/30 rounded-lg p-4 md:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg md:text-xl font-semibold text-slate-200 capitalize">
          {type === 'offense' ? '🏈' : '🛡️'} {type} Metrics
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleAddOrClearAll}
            className="text-xs md:text-sm px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white transition-colors"
            title={allMetricsSelected ? 'Remove all metrics' : 'Add all available metrics'}
          >
            {allMetricsSelected ? 'Clear All' : 'Add All'}
          </button>
          <button
            onClick={handleResetToDefaults}
            className="text-xs md:text-sm px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Selected Metrics */}
      <div className="space-y-2 mb-4">
        <p className="text-sm md:text-base text-slate-400">Selected ({selectedMetrics.length}/{maxMetrics}):</p>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {selectedMetrics.map((metricKey, index) => {
            const metric = AVAILABLE_METRICS[metricKey];
            return (
              <div
                key={metricKey}
                className="flex items-center gap-2 bg-blue-600/20 border border-blue-400/30 rounded-lg px-3 py-2 text-sm md:text-base"
              >
                <span className="text-blue-300 font-medium">
                  {index + 1}. {metric?.name || metricKey}
                </span>
                <button
                  onClick={() => handleRemoveMetric(metricKey)}
                  className="text-red-400 hover:text-red-300 ml-1"
                  title="Remove metric"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metrics Selection Panel */}
      <div className="border-t border-slate-600/30 pt-4">
        <p className="text-sm md:text-base text-slate-400 mb-3">
          Click any metric to toggle selection:
        </p>
          
          {/* Categories */}
          <div className="space-y-4">
            {Object.entries(metricsByCategory).map(([category, metrics]) => (
              <div key={category}>
                <h4 className="text-sm md:text-base font-medium text-slate-300 mb-2 flex items-center gap-2">
                  {getCategoryEmoji(category)}
                  <span className="capitalize">{category}</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3 lg:gap-4">
                  {Object.entries(metrics).map(([metricKey, metric]) => {
                    const isSelected = selectedMetrics.includes(metricKey);
                    const isDisabled = !isSelected && selectedMetrics.length >= maxMetrics;
                    
                    return (
                      <button
                        key={metricKey}
                        onClick={() => !isDisabled && handleToggleMetric(metricKey)}
                        disabled={isDisabled}
                        className={`
                          text-left p-3 md:p-3 rounded-lg border text-sm md:text-sm transition-all
                          min-h-[120px] md:min-h-[110px] lg:min-h-[105px]
                          ${isSelected 
                            ? 'bg-green-600/20 border-green-400/30 text-green-300 hover:bg-green-600/30 cursor-pointer' 
                            : isDisabled
                            ? 'bg-slate-800/50 border-slate-700/30 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-700/50 border-slate-600/30 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500/50 cursor-pointer'
                          }
                        `}
                        title={isSelected ? `Click to remove: ${metric.description}` : metric.description}
                      >
                        <div className="font-medium line-clamp-1">
                          {isSelected && '✓ '}{metric.name}
                        </div>
                        <div className="text-xs md:text-xs opacity-70 mt-1">
                          ({metric.field}) {metric.higherIsBetter ? '↑ Higher is better' : '↓ Lower is better'}
                        </div>
                        {metric.description && (
                          <div className="text-xs md:text-xs opacity-60 mt-1 line-clamp-2">
                            {metric.description}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        {/* Add Metrics Limit Warning (Hidden - no more limits) */}
        {false && selectedMetrics.length >= maxMetrics && (
          <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-400/30 rounded-lg">
            <p className="text-sm text-yellow-300">
              ⚠️ Maximum {maxMetrics} metrics reached. Remove some metrics to add new ones.
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-slate-600/30">
        <div className="flex justify-between text-xs md:text-sm text-slate-400">
          <span>{availableToAdd.length} more available</span>
          <span>{selectedMetrics.length}/{maxMetrics} selected</span>
        </div>
      </div>
    </div>
  );
}

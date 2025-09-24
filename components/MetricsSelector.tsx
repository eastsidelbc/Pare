/**
 * Dynamic Metrics Selector Component
 * 
 * Allows users to customize which metrics they want to see in their comparison.
 * Shows friendly names with technical field names in parentheses.
 */

'use client';

import { useState } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get available metrics grouped by category
  const metricsByCategory = getMetricsByCategory(type);
  const availableMetricKeys = Object.keys(getMetricsByCategory(type)).reduce((acc, category) => {
    return [...acc, ...Object.keys(metricsByCategory[category])];
  }, [] as string[]);

  // Handle adding a metric
  const handleAddMetric = (metricKey: string) => {
    if (!selectedMetrics.includes(metricKey) && selectedMetrics.length < maxMetrics) {
      onMetricsChange([...selectedMetrics, metricKey]);
    }
  };

  // Handle removing a metric
  const handleRemoveMetric = (metricKey: string) => {
    onMetricsChange(selectedMetrics.filter(key => key !== metricKey));
  };

  // Reset to defaults
  const handleResetToDefaults = () => {
    const defaults = type === 'offense' ? DEFAULT_OFFENSE_METRICS : DEFAULT_DEFENSE_METRICS;
    onMetricsChange(defaults);
  };


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

  // Get metrics not currently selected
  const availableToAdd = availableMetricKeys.filter(key => !selectedMetrics.includes(key));

  return (
    <div className={`bg-slate-800/50 border border-slate-600/30 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-200 capitalize">
          {type === 'offense' ? '🏈' : '🛡️'} {type} Metrics
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleResetToDefaults}
            className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
          >
            Reset Defaults
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Customize'}
          </button>
        </div>
      </div>

      {/* Selected Metrics */}
      <div className="space-y-2 mb-4">
        <p className="text-sm text-slate-400">Selected ({selectedMetrics.length}/{maxMetrics}):</p>
        <div className="flex flex-wrap gap-2">
          {selectedMetrics.map((metricKey, index) => {
            const metric = AVAILABLE_METRICS[metricKey];
            return (
              <div
                key={metricKey}
                className="flex items-center gap-2 bg-blue-600/20 border border-blue-400/30 rounded-lg px-3 py-2 text-sm"
              >
                <span className="text-blue-300 font-medium">
                  {index + 1}. {metric?.name || metricKey}
                </span>
                <span className="text-blue-400/70 text-xs">
                  ({metric?.field || metricKey})
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

      {/* Expanded Customization Panel */}
      {isExpanded && (
        <div className="border-t border-slate-600/30 pt-4">
          <p className="text-sm text-slate-400 mb-3">
            Add metrics (click to add):
          </p>
          
          {/* Categories */}
          <div className="space-y-4">
            {Object.entries(metricsByCategory).map(([category, metrics]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  {getCategoryEmoji(category)}
                  <span className="capitalize">{category}</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(metrics).map(([metricKey, metric]) => {
                    const isSelected = selectedMetrics.includes(metricKey);
                    const canAdd = !isSelected && selectedMetrics.length < maxMetrics;
                    
                    return (
                      <button
                        key={metricKey}
                        onClick={() => canAdd && handleAddMetric(metricKey)}
                        disabled={isSelected || selectedMetrics.length >= maxMetrics}
                        className={`
                          text-left p-3 rounded-lg border text-sm transition-all
                          ${isSelected 
                            ? 'bg-green-600/20 border-green-400/30 text-green-300 cursor-default' 
                            : canAdd
                            ? 'bg-slate-700/50 border-slate-600/30 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500/50 cursor-pointer'
                            : 'bg-slate-800/50 border-slate-700/30 text-slate-500 cursor-not-allowed'
                          }
                        `}
                        title={metric.description}
                      >
                        <div className="font-medium">
                          {isSelected && '✓ '}{metric.name}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          ({metric.field}) {metric.higherIsBetter ? '↑ Higher is better' : '↓ Lower is better'}
                        </div>
                        {metric.description && (
                          <div className="text-xs opacity-60 mt-1">
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
      )}

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-slate-600/30">
        <div className="flex justify-between text-xs text-slate-400">
          <span>{availableToAdd.length} more available</span>
          <span>{selectedMetrics.length}/{maxMetrics} selected</span>
        </div>
      </div>
    </div>
  );
}

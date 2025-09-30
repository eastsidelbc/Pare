/**
 * Floating Metrics Button Component
 * 
 * Fixed position button in bottom-right corner that provides access to metrics customization.
 * Expands upward and leftward to show MetricsSelector interface.
 * Provides app-like floating action button experience.
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamic import for MetricsSelector (code splitting for mobile performance)
const MetricsSelector = dynamic(() => import('@/components/MetricsSelector'), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
    </div>
  ),
  ssr: false // Not needed on server since it's user interaction
});

interface FloatingMetricsButtonProps {
  selectedOffenseMetrics: string[];
  selectedDefenseMetrics: string[];
  onOffenseMetricsChange: (metrics: string[]) => void;
  onDefenseMetricsChange: (metrics: string[]) => void;
}

export default function FloatingMetricsButton({
  selectedOffenseMetrics,
  selectedDefenseMetrics,
  onOffenseMetricsChange,
  onDefenseMetricsChange
}: FloatingMetricsButtonProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'offense' | 'defense'>('offense');

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-20 right-4 w-96 sm:w-[28rem] max-w-[calc(100vw-2rem)] z-50"
          >
            <div 
              id="metrics-panel"
              className="bg-slate-900/95 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-2xl p-4"
              role="dialog"
              aria-labelledby="metrics-panel-title"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 id="metrics-panel-title" className="text-lg font-bold text-white">⚙️ Customize Metrics</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-white transition-colors focus-ring"
                  aria-label="Close metrics panel"
                >
                  ✕
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-2 mb-4" role="tablist" aria-label="Metrics category selection">
                <button
                  onClick={() => setActiveTab('offense')}
                  className={`
                    px-4 py-3 text-sm rounded-lg transition-colors flex-1
                    min-h-[2.75rem] touch-optimized focus-ring
                    ${activeTab === 'offense' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }
                  `}
                  role="tab"
                  aria-selected={activeTab === 'offense'}
                  aria-controls="offense-metrics"
                  id="offense-tab"
                >
                  🏈 Offense ({selectedOffenseMetrics.length})
                </button>
                <button
                  onClick={() => setActiveTab('defense')}
                  className={`
                    px-4 py-3 text-sm rounded-lg transition-colors flex-1
                    min-h-[2.75rem] touch-optimized focus-ring
                    ${activeTab === 'defense' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }
                  `}
                  role="tab"
                  aria-selected={activeTab === 'defense'}
                  aria-controls="defense-metrics"
                  id="defense-tab"
                >
                  🛡️ Defense ({selectedDefenseMetrics.length})
                </button>
              </div>

              {/* Metrics Selector */}
              <div className="max-h-[32rem] overflow-y-auto momentum-scroll">
                {activeTab === 'offense' && (
                  <div 
                    role="tabpanel" 
                    id="offense-metrics" 
                    aria-labelledby="offense-tab"
                  >
                    <MetricsSelector
                      selectedMetrics={selectedOffenseMetrics}
                      onMetricsChange={onOffenseMetricsChange}
                      type="offense"
                      maxMetrics={99}
                    />
                  </div>
                )}

                {activeTab === 'defense' && (
                  <div 
                    role="tabpanel" 
                    id="defense-metrics" 
                    aria-labelledby="defense-tab"
                  >
                    <MetricsSelector
                      selectedMetrics={selectedDefenseMetrics}
                      onMetricsChange={onDefenseMetricsChange}
                      type="defense"
                      maxMetrics={99}
                    />
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between">
                <button
                  onClick={() => {
                    if (activeTab === 'offense') {
                      onOffenseMetricsChange([]);
                    } else {
                      onDefenseMetricsChange([]);
                    }
                  }}
                  className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors min-h-[2.75rem] touch-optimized"
                >
                  Clear {activeTab === 'offense' ? 'Offense' : 'Defense'}
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors min-h-[2.75rem] touch-optimized"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setShowSettings(!showSettings)}
        className={`
          fixed bottom-4 right-4 z-50
          w-14 h-14 min-w-[3.5rem] min-h-[3.5rem]
          bg-slate-700 hover:bg-slate-600
          text-white text-xl
          rounded-full
          shadow-lg shadow-black/25
          transition-all duration-200
          flex items-center justify-center
          touch-optimized focus-ring
          ${showSettings ? 'bg-purple-600 hover:bg-purple-700' : ''}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        aria-label={showSettings ? "Close metrics customization panel" : "Open metrics customization panel"}
        aria-expanded={showSettings}
        aria-controls="metrics-panel"
      >
        <motion.div
          animate={{ rotate: showSettings ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ⚙️
        </motion.div>
      </motion.button>
    </>
  );
}

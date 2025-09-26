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
import MetricsSelector from '@/components/MetricsSelector';

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
            <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-2xl p-4">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">⚙️ Customize Metrics</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('offense')}
                  className={`
                    px-4 py-2 text-sm rounded-lg transition-colors flex-1
                    ${activeTab === 'offense' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }
                  `}
                >
                  🏈 Offense ({selectedOffenseMetrics.length})
                </button>
                <button
                  onClick={() => setActiveTab('defense')}
                  className={`
                    px-4 py-2 text-sm rounded-lg transition-colors flex-1
                    ${activeTab === 'defense' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }
                  `}
                >
                  🛡️ Defense ({selectedDefenseMetrics.length})
                </button>
              </div>

              {/* Metrics Selector */}
              <div className="max-h-[32rem] overflow-y-auto">
                {activeTab === 'offense' && (
                  <MetricsSelector
                    selectedMetrics={selectedOffenseMetrics}
                    onMetricsChange={onOffenseMetricsChange}
                    type="offense"
                    maxMetrics={99}
                  />
                )}

                {activeTab === 'defense' && (
                  <MetricsSelector
                    selectedMetrics={selectedDefenseMetrics}
                    onMetricsChange={onDefenseMetricsChange}
                    type="defense"
                    maxMetrics={99}
                  />
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
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  Clear {activeTab === 'offense' ? 'Offense' : 'Defense'}
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
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
          w-12 h-12
          bg-slate-700 hover:bg-slate-600
          text-white text-xl
          rounded-full
          shadow-lg shadow-black/25
          transition-all duration-200
          flex items-center justify-center
          ${showSettings ? 'bg-purple-600 hover:bg-purple-700' : ''}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
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

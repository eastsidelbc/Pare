'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineStatus } from '@/lib/useOfflineStatus';

interface OfflineStatusBannerProps {
  className?: string;
}

/**
 * Banner that shows when the user is offline
 * Provides visual feedback about connection status and cached data availability
 */
export default function OfflineStatusBanner({ className = '' }: OfflineStatusBannerProps) {
  const { isOffline, connectionType, effectiveType } = useOfflineStatus();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`
            fixed top-0 left-0 right-0 z-50 
            bg-amber-500/90 backdrop-blur-sm border-b border-amber-400/50
            px-4 py-2 text-center text-amber-900 font-medium text-sm
            ${className}
          `}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center justify-center gap-2 max-w-6xl mx-auto">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
              <span>📱 You're offline</span>
            </div>
            
            <span className="hidden sm:inline text-amber-700">•</span>
            
            <span className="hidden sm:inline text-amber-700">
              Showing cached NFL stats - reconnect for fresh data
            </span>

            {/* Connection info for debugging (only in dev) */}
            {process.env.NODE_ENV === 'development' && (
              <>
                <span className="hidden md:inline text-amber-700">•</span>
                <span className="hidden md:inline text-xs text-amber-600">
                  {connectionType && `${connectionType}`}
                  {effectiveType && ` (${effectiveType})`}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

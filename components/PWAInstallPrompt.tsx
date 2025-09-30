'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWA } from '@/lib/usePWA';

interface PWAInstallPromptProps {
  className?: string;
  autoShow?: boolean;
  onInstall?: () => void;
  onDismiss?: () => void;
}

/**
 * Component that prompts users to install the PWA
 * Handles different installation flows for iOS, Android, and desktop
 */
export default function PWAInstallPrompt({ 
  className = '', 
  autoShow = true,
  onInstall,
  onDismiss 
}: PWAInstallPromptProps) {
  const { 
    canInstall, 
    isIOS, 
    isAndroid, 
    isStandalone, 
    displayMode,
    install, 
    dismissInstallPrompt 
  } = usePWA();
  
  const [isVisible, setIsVisible] = useState(autoShow);
  const [isInstalling, setIsInstalling] = useState(false);

  // Don't show if already installed or not installable
  if (isStandalone || !canInstall || !isVisible) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const success = await install();
      if (success) {
        onInstall?.();
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    setIsVisible(false);
    onDismiss?.();
  };

  const getInstallInstructions = () => {
    if (isIOS) {
      return {
        title: "Add Pare NFL to Home Screen",
        steps: [
          "Tap the Share button",
          "Scroll down and tap 'Add to Home Screen'", 
          "Tap 'Add' to install the app"
        ],
        icon: "📱",
        buttonText: "Got it!"
      };
    } else if (isAndroid) {
      return {
        title: "Install Pare NFL App", 
        steps: [
          "Tap 'Install' to add to your device",
          "Use like any native app",
          "Access directly from home screen"
        ],
        icon: "🏈",
        buttonText: "Install App"
      };
    } else {
      return {
        title: "Install Pare NFL", 
        steps: [
          "Click 'Install' for desktop app",
          "Launch from desktop or start menu",
          "Works offline with cached stats"
        ],
        icon: "💻",
        buttonText: "Install App"
      };
    }
  };

  const instructions = getInstallInstructions();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`
          fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto
          bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-xl
          p-4 text-white shadow-2xl
          ${className}
        `}
        role="dialog"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="App icon">
              {instructions.icon}
            </span>
            <h3 
              id="pwa-install-title"
              className="font-semibold text-lg text-slate-100"
            >
              {instructions.title}
            </h3>
          </div>
          
          <button
            onClick={handleDismiss}
            className="
              p-1 rounded-lg hover:bg-slate-700/50 transition-colors
              focus:outline-none focus:ring-2 focus:ring-purple-500
            "
            aria-label="Dismiss install prompt"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <div id="pwa-install-description" className="mb-4">
          <p className="text-slate-300 text-sm mb-2">
            Get the full app experience with offline access and faster loading:
          </p>
          
          {isIOS ? (
            <ol className="text-sm text-slate-300 space-y-1">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="
                    flex-shrink-0 w-5 h-5 bg-purple-500 text-white text-xs 
                    rounded-full flex items-center justify-center mt-0.5
                  ">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          ) : (
            <ul className="text-sm text-slate-300 space-y-1">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  {step}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {isIOS ? (
            <button
              onClick={handleDismiss}
              className="
                flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 
                rounded-lg font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-purple-500
              "
            >
              {instructions.buttonText}
            </button>
          ) : (
            <>
              <button
                onClick={handleDismiss}
                className="
                  px-4 py-2 text-slate-300 hover:text-white transition-colors
                  focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg
                "
              >
                Not now
              </button>
              
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="
                  flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 
                  disabled:bg-purple-600/50 disabled:cursor-not-allowed
                  rounded-lg font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-purple-500
                  flex items-center justify-center gap-2
                "
              >
                {isInstalling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Installing...
                  </>
                ) : (
                  instructions.buttonText
                )}
              </button>
            </>
          )}
        </div>

        {/* Debug info (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-3 pt-3 border-t border-slate-600/50">
            <p className="text-xs text-slate-500">
              Debug: {isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'} • Mode: {displayMode}
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

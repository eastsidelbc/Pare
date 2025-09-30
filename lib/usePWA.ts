'use client';

import { useState, useEffect } from 'react';

interface PWAStatus {
  isStandalone: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  canInstall: boolean;
  displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen';
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Hook to detect PWA installation status and provide install functionality
 * Handles cross-platform PWA detection and installation prompts
 */
export function usePWA(): PWAStatus & {
  install: () => Promise<boolean>;
  dismissInstallPrompt: () => void;
} {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [displayMode, setDisplayMode] = useState<PWAStatus['displayMode']>('browser');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detect Android
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);

    // Check if running in standalone mode
    const checkStandalone = () => {
      // Method 1: Check display-mode media query
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsStandalone(true);
        setDisplayMode('standalone');
        console.log('📱 [PWA] Running in standalone mode (display-mode)');
        return true;
      }

      // Method 2: Check window.navigator.standalone (iOS Safari specific)
      if ((window.navigator as any).standalone === true) {
        setIsStandalone(true);
        setDisplayMode('standalone');
        console.log('📱 [PWA] Running in standalone mode (navigator.standalone)');
        return true;
      }

      // Method 3: Check minimal-ui or fullscreen modes
      if (window.matchMedia('(display-mode: minimal-ui)').matches) {
        setDisplayMode('minimal-ui');
        console.log('📱 [PWA] Running in minimal-ui mode');
      } else if (window.matchMedia('(display-mode: fullscreen)').matches) {
        setDisplayMode('fullscreen');
        console.log('📱 [PWA] Running in fullscreen mode');
      } else {
        setDisplayMode('browser');
      }

      return false;
    };

    checkStandalone();

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const beforeInstallEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(beforeInstallEvent);
      setIsInstallable(true);
      console.log('📱 [PWA] Install prompt available', {
        platforms: beforeInstallEvent.platforms,
        userAgent: navigator.userAgent.substring(0, 100)
      });
    };

    // Listen for app install event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      console.log('✅ [PWA] App was installed successfully');
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check iOS installability (iOS Safari doesn't fire beforeinstallprompt)
    if (iOS && !checkStandalone()) {
      // On iOS, app is "installable" if not already standalone and running in Safari
      const isInSafari = /Safari/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);
      if (isInSafari) {
        setIsInstallable(true);
        console.log('📱 [PWA] iOS Safari detected - manual install available');
      }
    }

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Install function
  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.log('⚠️ [PWA] No install prompt available');
      return false;
    }

    try {
      console.log('📱 [PWA] Showing install prompt...');
      await deferredPrompt.prompt();
      
      const choiceResult = await deferredPrompt.userChoice;
      console.log('📱 [PWA] User choice:', choiceResult);
      
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [PWA] Install failed:', error);
      return false;
    }
  };

  // Dismiss install prompt
  const dismissInstallPrompt = () => {
    setDeferredPrompt(null);
    setIsInstallable(false);
    console.log('🙈 [PWA] Install prompt dismissed');
  };

  const canInstall = isInstallable && !isStandalone;

  return {
    isStandalone,
    isInstallable,
    isIOS,
    isAndroid,
    canInstall,
    displayMode,
    install,
    dismissInstallPrompt,
  };
}

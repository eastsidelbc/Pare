/**
 * Professional preload utility for MetricsSelector component
 * Ensures chunk is loaded, parsed, and ready before opening drawer
 * 
 * Uses singleton pattern to prevent duplicate network requests
 */

/** The lazily-imported MetricsSelector module (typed, not `any`). */
type MetricsSelectorModule = typeof import('@/components/MetricsSelector');

let _preloadPromise: Promise<MetricsSelectorModule> | null = null;

/**
 * Preload MetricsSelector component chunk
 * Safe to call multiple times - only fetches once
 * 
 * @returns Promise that resolves when component is loaded and parsed
 */
export const preloadMetricsSelector = (): Promise<MetricsSelectorModule> => {
  if (!_preloadPromise) {
    _preloadPromise = import(
      /* webpackPrefetch: true */
      /* webpackChunkName: "metrics-selector" */
      '@/components/MetricsSelector'
    );
  }
  return _preloadPromise;
};

/**
 * Check if MetricsSelector has been preloaded
 * Useful for debugging and conditional logic
 */
export const isMetricsSelectorPreloaded = (): boolean => {
  return _preloadPromise !== null;
};


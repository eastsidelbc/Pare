// utils/logger.ts
/**
 * Centralized logger with environment-aware gating.
 * Blocks noisy logs in production and respects LOG_LEVEL.
 */

export const LOG_LEVEL = (process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === 'production' ? 'warn' : 'debug')) as
  'debug' | 'info' | 'warn' | 'error';

export function log(level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]) {
  const order = { debug: 0, info: 1, warn: 2, error: 3 };
  const current = order[LOG_LEVEL];
  if (order[level] < current) return;
  // eslint-disable-next-line no-console
  console[level](...args);
}

/** Example usage:
 * import { log } from '@/utils/logger';
 * log('debug', 'ranking inputs', { metricKey, teamA, teamB });
 */

// Compatibility shim for code that imports `{ logger }`
// Keeps existing call sites working without changing their code
export const logger = {
  cache(ctx: any, msg: string, meta?: any) {
    log('debug', '[CACHE]', ctx, msg, meta);
  },
  performance(ctx: any, msg: string, meta?: any) {
    log('info', '[PERF]', ctx, msg, meta);
  },
  debug(...args: any[]) {
    log('debug', ...args);
  },
  info(...args: any[]) {
    log('info', ...args);
  },
  warn(...args: any[]) {
    log('warn', ...args);
  },
  error(...args: any[]) {
    log('error', ...args);
  },
} as const;

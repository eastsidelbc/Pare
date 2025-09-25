/**
 * Centralized logging utility with structured context, emoji prefixes, and log levels
 */

export type LogLevel = 'minimal' | 'verbose';

export interface LogContext {
  context: string;
  requestId?: string;
  timestamp?: string;
}

// Environment-based log level configuration
const getLogLevel = (): LogLevel => {
  // In production or when explicitly set, use minimal logging
  if (process.env.NODE_ENV === 'production' || process.env.LOG_LEVEL === 'minimal') {
    return 'minimal';
  }
  // Default to verbose for development
  return process.env.LOG_LEVEL as LogLevel || 'verbose';
};

const LOG_LEVEL = getLogLevel();

export const logger = {
  debug: (context: LogContext, message: string, data?: unknown) => {
    // Only show debug logs in verbose mode
    if (LOG_LEVEL !== 'verbose') return;
    
    const { context: ctx, requestId, timestamp } = context;
    const timeStr = timestamp || new Date().toISOString();
    const prefix = requestId ? `[${ctx}-${requestId}]` : `[${ctx}]`;
    
    console.log(`🏈 ${prefix} [${timeStr}] ${message}`);
    if (data) {
      console.log(`🏈 ${prefix} Data:`, data);
    }
  },
  performance: (context: LogContext, message: string, timing?: { duration: number; operation: string }) => {
    // Always show performance logs (minimal requirement)
    const { context: ctx, requestId } = context;
    const prefix = requestId ? `[${ctx}-${requestId}]` : `[${ctx}]`;
    
    if (timing) {
      console.log(`⚡ ${prefix} ${timing.operation}: ${timing.duration}ms`);
    } else {
      console.log(`⚡ ${prefix} ${message}`);
    }
  },
  cache: (context: LogContext, message: string, data?: unknown) => {
    // Only show cache logs in verbose mode
    if (LOG_LEVEL !== 'verbose') return;
    
    const { context: ctx, requestId } = context;
    const prefix = requestId ? `[${ctx}-${requestId}]` : `[${ctx}]`;
    
    console.log(`💾 ${prefix} ${message}`);
    if (data) {
      console.log(`💾 ${prefix} Cache info:`, data);
    }
  },
  error: (context: LogContext, message: string, error?: unknown) => {
    // Always show errors (minimal requirement)
    const { context: ctx, requestId } = context;
    const prefix = requestId ? `[${ctx}-${requestId}]` : `[${ctx}]`;
    
    console.error(`❌ ${prefix} ${message}`);
    if (error) {
      console.error(`❌ ${prefix} Error details:`, error);
    }
  },
  success: (context: LogContext, message: string) => {
    // Only show success logs in verbose mode
    if (LOG_LEVEL !== 'verbose') return;
    
    const { context: ctx, requestId } = context;
    const prefix = requestId ? `[${ctx}-${requestId}]` : `[${ctx}]`;
    
    console.log(`✅ ${prefix} ${message}`);
  },
};
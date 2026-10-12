/**
 * The one door to Sleeper for My Team (server-only).
 *
 * Every call takes from one process-wide budget (≈60% of Sleeper's documented
 * "stay under 1000 API calls per minute" per IP — all Pare users share the Mac
 * mini's IP). Over budget → throws, and the keyed caches serve last-good.
 * no-store + AbortSignal.timeout so the timeout always applies (never a cached
 * fetch — see CLAUDE.md "fetch timeout is ignored during ISR"). Errors never
 * include the URL (it can contain a username).
 */
import 'server-only';
import { createCallBudget } from '@/lib/apiCache';

export const SLEEPER_API = 'https://api.sleeper.app/v1';
export const SLEEPER_STATS_API = 'https://api.sleeper.com';
export const SLEEPER_CALLS_PER_MIN = 600;
export const SLEEPER_TIMEOUT_MS = 5_000;

const budget = createCallBudget({ limit: SLEEPER_CALLS_PER_MIN, windowMs: 60_000 });

export class SleeperBudgetError extends Error {
  constructor() {
    super('Sleeper call budget exhausted');
    this.name = 'SleeperBudgetError';
  }
}

export async function sleeperJson<T>(url: string, timeoutMs = SLEEPER_TIMEOUT_MS): Promise<T> {
  if (!budget.tryTake()) throw new SleeperBudgetError();
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`Sleeper HTTP ${res.status}`);
  return (await res.json()) as T;
}

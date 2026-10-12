/**
 * JSON responses for /api/myteam/* — private, never cached, and errors never
 * echo user input (usernames must not end up in logs or bodies).
 */
import { NextResponse } from 'next/server';

const HEADERS = { 'Cache-Control': 'private, no-store' };

/** `durMs` (handler time) goes out as a Server-Timing header for perf checks. */
export function ok<T>(body: T, durMs?: number): NextResponse {
  const headers = durMs === undefined ? HEADERS : { ...HEADERS, 'Server-Timing': `app;dur=${durMs.toFixed(1)}` };
  return NextResponse.json(body, { headers });
}

export function fail(status: 400 | 404 | 502 | 503, error: string): NextResponse {
  return NextResponse.json({ error }, { status, headers: HEADERS });
}

/** Upstream failure → 503 when our Sleeper budget is spent, else 502. Logs without user input. */
export function upstreamFailure(err: unknown, label: string): NextResponse {
  const reason = err instanceof Error ? err.message : String(err);
  console.error(`❌ [${label}] ${reason}`);
  return err instanceof Error && err.name === 'SleeperBudgetError' ? fail(503, 'busy') : fail(502, 'upstream');
}

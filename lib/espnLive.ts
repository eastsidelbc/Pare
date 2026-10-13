/**
 * The one door to ESPN for live data (server-only): the week scoreboard the
 * schedule polls every 15s and the post-game box scores. Browsers call
 * /api/live/* and never ESPN; this module fetches when a request needs it,
 * trims + maps the payload, keeps it in memory and serves one shared copy.
 *
 * - Pull-based: no timers. A request after the TTL refetches (single-flight).
 * - ESPN failure → last-good copy marked STALE, with per-key backoff.
 * - Budgets: 120 ESPN calls/min overall, of which summaries may use at most 60,
 *   so random event ids can never starve the scoreboard. Taken by the caches,
 *   so a spent budget serves STALE instead of failing.
 * - no-store fetch + AbortSignal.timeout (6s, under the client's 8s abort): the
 *   timeout always applies and our STALE/502 answer beats the browser's give-up.
 * - Memory is the only cache, per Node process (single PM2 fork assumed — see
 *   docs/adr/2026-10-12-live-scores-proxy.md).
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { createCallBudget, createLiveCache, LiveBudgetError, type LiveResult } from '@/lib/apiCache';
import { ESPN_SCOREBOARD_URL, mapEspnScoreboard, type EspnScoreboard } from '@/lib/espnScoreboard';
import { isSummaryFinal, parseSummary, type EspnSummary, type EspnSummaryStatus, type GameSummary } from '@/lib/gameSummary';
import { scoreboardTtlMs } from '@/lib/liveWindow';
import type { Matchup } from '@/lib/schedule';

export const ESPN_SUMMARY_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary';
export const ESPN_LIVE_TIMEOUT_MS = 6_000;
export const ESPN_LIVE_CALLS_PER_MIN = 120;
export const SUMMARY_CALLS_PER_MIN = 60;

const HOUR = 3_600_000;
const SUMMARY_FINAL_TTL_MS = 6 * HOUR;
const SUMMARY_OPEN_TTL_MS = 60_000;

const espnBudget = createCallBudget({ limit: ESPN_LIVE_CALLS_PER_MIN, windowMs: 60_000 });
const summaryBudget = createCallBudget({ limit: SUMMARY_CALLS_PER_MIN, windowMs: 60_000 });

/** no-store + timeout so the timeout always applies; errors carry the status, never a body. */
export async function espnLiveJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ESPN_LIVE_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`);
  return (await res.json()) as T;
}

// ── scoreboard ──────────────────────────────────────────────────────────

export interface ScoreboardEntry {
  week: number;
  matchups: Matchup[];
  /** `matchups` serialized once per upstream fetch, so hot reads never re-stringify. */
  matchupsJson: string;
}

const scoreboardCache = createLiveCache<ScoreboardEntry>({
  label: 'live:scoreboard',
  max: 18,
  retainMs: 6 * HOUR,
  ttlFor: (v, now) => scoreboardTtlMs(v.matchups, now),
  budgets: [espnBudget],
});

async function fetchScoreboard(week: number): Promise<ScoreboardEntry> {
  const raw = await espnLiveJson<EspnScoreboard>(`${ESPN_SCOREBOARD_URL}?seasontype=2&week=${week}`);
  const matchups = mapEspnScoreboard(raw, week);
  // Empty is never a real week — throw so last-good wins.
  if (matchups.length === 0) throw new Error('ESPN scoreboard empty');
  return { week, matchups, matchupsJson: JSON.stringify(matchups) };
}

export function getLiveScoreboard(week: number): Promise<LiveResult<ScoreboardEntry>> {
  return scoreboardCache.get(String(week), () => fetchScoreboard(week));
}

/** `{ week, updatedAt, stale, matchups }` built around the pre-serialized matchups. */
export function scoreboardBody({ value, status, updatedAt }: LiveResult<ScoreboardEntry>): string {
  const updated = JSON.stringify(new Date(updatedAt).toISOString());
  return `{"week":${value.week},"updatedAt":${updated},"stale":${status === 'STALE'},"matchups":${value.matchupsJson}}`;
}

// ── summary (post-game box score) ───────────────────────────────────────

export interface SummaryEntry {
  summary: GameSummary;
  /** `summary` serialized once per upstream fetch. */
  json: string;
  final: boolean;
}

const summaryCache = createLiveCache<SummaryEntry>({
  label: 'live:summary',
  max: 300,
  retainMs: 24 * HOUR,
  ttlFor: (v) => (v.final ? SUMMARY_FINAL_TTL_MS : SUMMARY_OPEN_TTL_MS),
  budgets: [espnBudget, summaryBudget],
});

async function fetchSummary(eventId: string): Promise<SummaryEntry> {
  const raw = await espnLiveJson<EspnSummary & EspnSummaryStatus>(`${ESPN_SUMMARY_URL}?event=${eventId}`);
  const summary = parseSummary(raw);
  return { summary, json: JSON.stringify(summary), final: isSummaryFinal(raw) };
}

export function getLiveSummary(eventId: string): Promise<LiveResult<SummaryEntry>> {
  return summaryCache.get(eventId, () => fetchSummary(eventId));
}

// ── validation + responses ──────────────────────────────────────────────

/** Regular-season week 1–18 (postseason is out of scope, like today), else null. */
export function parseLiveWeek(v: string | null): number | null {
  if (!v || !/^\d{1,2}$/.test(v)) return null;
  const w = Number(v);
  return w >= 1 && w <= 18 ? w : null;
}

export function isValidEventId(v: string | null): v is string {
  return v !== null && /^\d{6,12}$/.test(v);
}

/**
 * 200 with a shared-cache header sized to the REMAINING freshness (a HIT at
 * 14s of 15s must not let an edge cache keep it another 15s). Browsers ignore
 * s-maxage; the hooks fetch no-store anyway.
 */
export function liveOk(body: string, result: LiveResult<unknown>): NextResponse {
  const maxAge = Math.max(1, Math.ceil(result.freshForMs / 1000));
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${2 * maxAge}`,
      'X-Pare-Cache': result.status,
    },
  });
}

export function liveFail(status: 400 | 502 | 503, error: 'invalid-week' | 'invalid-event' | 'upstream' | 'busy'): NextResponse {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** No last-good copy to serve: 503 when our ESPN budget is spent, else 502 (the cache already logged why). */
export function liveUpstreamFailure(err: unknown): NextResponse {
  return err instanceof LiveBudgetError ? liveFail(503, 'busy') : liveFail(502, 'upstream');
}

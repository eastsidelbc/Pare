/**
 * GET /api/live/summary?event=<ESPN event id> → GameSummary ({ byAbbr, headline }),
 * parsed server-side from ESPN's summary. Final games are cached 6h, others 60s
 * (lib/espnLive.ts). Staleness travels in X-Pare-Cache: STALE.
 * 400 invalid-event · 502 upstream · 503 busy (summary budget spent).
 */
import { getLiveSummary, isValidEventId, liveFail, liveOk, liveUpstreamFailure } from '@/lib/espnLive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get('event');
  if (!isValidEventId(eventId)) return liveFail(400, 'invalid-event');
  try {
    const result = await getLiveSummary(eventId);
    return liveOk(result.value.json, result);
  } catch (err) {
    return liveUpstreamFailure(err);
  }
}

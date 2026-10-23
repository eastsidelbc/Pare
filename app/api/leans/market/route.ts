/**
 * GET /api/leans/market?event=<ESPN event id> → GameMarket | null (lib/leans/market.ts):
 * spread / total / moneyline open → current, no-vig win chance, key numbers, weather,
 * venue. Market facts only — no user data. 400 bad id · 502 upstream.
 */
import type { NextRequest } from 'next/server';
import { isValidEventId } from '@/lib/espnLive';
import { getGameMarket } from '@/lib/leans/marketServer';
import { fail, ok, upstreamFailure } from '@/lib/myteam/apiErrors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('event');
  if (!isValidEventId(eventId)) return fail(400, 'invalid-event');
  try {
    const started = performance.now();
    return ok(await getGameMarket(eventId), performance.now() - started);
  } catch (err) {
    return upstreamFailure(err, 'leans:market');
  }
}

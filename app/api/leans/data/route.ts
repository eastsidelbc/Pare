/**
 * GET /api/leans/data?teams=ATL,LV → LeansBundle (lib/leans/bundle.ts):
 * league-wide team logs + FPA table + why-stat logs, and the asked teams'
 * prop-eligible players + schedule. Carries team abbreviations only — the
 * user's prop lines never leave the device. 400 bad teams · 502 upstream.
 */
import type { NextRequest } from 'next/server';
import { getLeansBundle } from '@/lib/leans/bundle';
import { LEAN_CONFIG } from '@/lib/leans/config';
import { fail, ok, upstreamFailure } from '@/lib/myteam/apiErrors';
import { getTeamByAbbr } from '@/lib/teams';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('teams') ?? '';
  const teams = raw === '' ? [] : raw.split(',');
  if (teams.length > LEAN_CONFIG.data.maxTeams || teams.some((t) => getTeamByAbbr(t)?.abbr !== t)) return fail(400, 'invalid-teams');
  try {
    const started = performance.now();
    const bundle = await getLeansBundle([...new Set(teams)]);
    return ok(bundle, performance.now() - started);
  } catch (err) {
    return upstreamFailure(err, 'leans:data');
  }
}

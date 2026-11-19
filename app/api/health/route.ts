/**
 * GET /api/health → { ok, commit, builtAt }
 *
 * Uptime checks, the iOS app and scripts/deploy.sh (which waits for `commit` to equal the new
 * release) use this. It tells the world only what's needed: no uptime, environment, paths or
 * versions (security hardening phase 3: less for a scanner to fingerprint).
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      commit: process.env.GIT_SHA ?? 'unknown',
      builtAt: process.env.BUILD_TIME ?? null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

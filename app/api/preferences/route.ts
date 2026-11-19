import { NextResponse } from 'next/server';

// Private, no-store stub preferences endpoint (nothing calls it yet).
// No PUT/POST on purpose: Next answers any other method with 405 Method Not Allowed. The old
// PUT stub returned 200 "saved: false" for any body (security hardening phase 3). Add a real,
// validated handler when preferences are actually stored.
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      prefs: {},
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    },
  );
}

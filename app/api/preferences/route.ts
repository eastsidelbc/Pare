import { NextResponse } from 'next/server';

// Private, no-store stub preferences endpoint
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
    }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      ok: true,
      saved: false,
      message: 'Preferences persistence not implemented yet',
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    }
  );
}



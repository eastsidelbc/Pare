import { NextResponse } from 'next/server';
import { getMockMatchup } from '@/mocks/mockMatchup';
import { logDebug } from '@/lib/logger';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const away = searchParams.get('away') || '';
  const home = searchParams.get('home') || '';

  logDebug('API/mock/matchup', { away, home, timestamp: Date.now() });

  if (!away || !home) {
    return NextResponse.json({ error: 'Missing away/home' }, { status: 400 });
  }

  const data = getMockMatchup(away.toUpperCase(), home.toUpperCase());
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}



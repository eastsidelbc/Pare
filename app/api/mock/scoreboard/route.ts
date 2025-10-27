import { NextResponse } from 'next/server';
import { MOCK_SCOREBOARD } from '@/mocks/mockScoreboard';

export async function GET() {
  return NextResponse.json(MOCK_SCOREBOARD, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}



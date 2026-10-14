/**
 * /leans/[gameId] — one game's lines, leans and props (Leans G2 game screen).
 * `gameId` = the schedule's Matchup id ("2026-w7-ATL-LV"). `?add=1` opens the
 * add-a-line sheet, `?pick=1` the player picker (links from the Leans list).
 */

import type { Metadata } from 'next';
import GameScreen, { type GameSheet } from '@/components/leans/GameScreen';

export const metadata: Metadata = { title: 'Leans · Pare' };

export default async function LeansGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ gameId }, query] = await Promise.all([params, searchParams]);
  const sheet: GameSheet = query.add === '1' ? 'add' : query.pick === '1' ? 'pick' : null;
  return <GameScreen gameId={decodeURIComponent(gameId)} initialSheet={sheet} />;
}

/**
 * /leans/[gameId] — one game's lines, leans and props (Leans G2 game screen).
 * `gameId` = the schedule's Matchup id ("2026-w7-ATL-LV"). Props come from the book
 * feed since 2026-10-23 (the old `?add=1` / `?pick=1` typing flow is retired).
 */

import type { Metadata } from 'next';
import GameScreen from '@/components/leans/GameScreen';

export const metadata: Metadata = { title: 'Leans · Pare' };

export default async function LeansGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  return <GameScreen gameId={decodeURIComponent(gameId)} />;
}

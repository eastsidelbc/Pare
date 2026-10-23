/**
 * /leans/prop/[propId] — one prop line from the book feed checked against the data (B2).
 * The id = game · player · stat (`propIdOf`, lib/leans/propLines.ts).
 */

import type { Metadata } from 'next';
import PropScreen from '@/components/leans/PropScreen';

export const metadata: Metadata = { title: 'Leans · Pare' };

export default async function LeansPropPage({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;
  return <PropScreen propId={decodeURIComponent(propId)} />;
}

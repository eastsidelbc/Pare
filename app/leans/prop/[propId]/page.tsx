/**
 * /leans/prop/[propId] — one saved prop line checked against the data (B2). The id
 * names a row in this device's storage only; the line itself never reaches the server.
 */

import type { Metadata } from 'next';
import PropScreen from '@/components/leans/PropScreen';

export const metadata: Metadata = { title: 'Leans · Pare' };

export default async function LeansPropPage({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;
  return <PropScreen propId={decodeURIComponent(propId)} />;
}

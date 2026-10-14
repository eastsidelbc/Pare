/**
 * Leans — the third tab (Leans DECISIONS §1–2): this week's games with their lines and a
 * data lean, plus the user's own prop lines. Static shell; data loads client-side from
 * /api/leans/data + the shared schedule store. Plan: docs/plans/2026-10-14-leans-tab.md.
 */

import type { Metadata } from 'next';
import LeansScreen from '@/components/leans/LeansScreen';

export const metadata: Metadata = { title: 'Leans · Pare' };

export default function LeansPage() {
  return <LeansScreen />;
}

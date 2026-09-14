/**
 * NFL Team Comparison route.
 *
 * Thin shell → renders the swipeable multi-comparison workspace (Vision Step 2).
 * The workspace reads the comparisons store, fetches stats once, and renders the
 * reusable <ComparePane> per comparison. Wrapped in Suspense because the
 * workspace reads `useSearchParams` (Next 15 requirement).
 */

'use client';

import { Suspense } from 'react';
import CompareWorkspace from '@/components/compare/CompareWorkspace';

export default function ComparePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />}>
      <CompareWorkspace />
    </Suspense>
  );
}

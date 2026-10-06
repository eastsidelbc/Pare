/**
 * RefreshOnReturn — renders nothing; re-renders the Leaders page with fresh data when
 * you come back to the app/tab after 10+ minutes (same hook as Standings).
 * `renderedAt` is stamped by the server render, so new data restarts the clock.
 */

'use client';

import { useRefreshOnReturn } from '@/lib/hooks/useRefreshOnReturn';

/** Leaders aren't live — 10 min is plenty (board data refreshes every 30 min). */
const REFRESH_ON_RETURN_AFTER_MS = 10 * 60 * 1000;

export default function RefreshOnReturn({ renderedAt }: { renderedAt: number }) {
  useRefreshOnReturn(renderedAt, REFRESH_ON_RETURN_AFTER_MS);
  return null;
}

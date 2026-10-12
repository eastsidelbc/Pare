/**
 * SettingsGearButton — the gear at the right edge of the Home header.
 *
 * In the iOS app it asks the native shell to open its Settings sheet (About, Privacy,
 * support email, version) through the bridge. Everywhere else it is a plain link to /about.
 * Same 44×44 tap box and press state as the favorites star next to it.
 */

'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { Settings } from 'lucide-react';
import { isInIosApp, postToApp } from '@/lib/platform';

export default function SettingsGearButton() {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Sent to the app → stay on this page; the native sheet opens on top.
    if (isInIosApp() && postToApp({ type: 'openSettings' })) e.preventDefault();
  };

  return (
    <Link
      href="/about"
      prefetch={false}
      onClick={onClick}
      aria-label="Settings"
      className="flex items-center justify-center rounded-full touch-optimized active:opacity-70"
      style={{ width: 44, height: 44 }}
    >
      <Settings size={20} strokeWidth={1.8} aria-hidden style={{ color: 'var(--subtext)' }} />
    </Link>
  );
}

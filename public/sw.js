// Pare service worker — KILL SWITCH (2026-10-06)
//
// The old PWA service worker (archived in _to-delete/2026-10-06-sw-pwa-cache/)
// served /api/* stale-while-revalidate with no max age, so phones that installed
// it kept seeing old schedules/odds. Production ships NEXT_PUBLIC_ENABLE_SW=false,
// but nothing removed it from devices that already had it.
//
// Browsers re-check /sw.js on navigation, so an old install picks this file up,
// and it then:
//   1. activates right away (skipWaiting),
//   2. deletes every Pare cache (pare-*),
//   3. unregisters itself.
// It has NO fetch handler, so from the moment it activates every request goes
// straight to the network. No forced reload — the open page just stops being
// served from cache (the schedule's stale-week refresh picks up fresh data).
//
// Harmless if NEXT_PUBLIC_ENABLE_SW is ever set to true: it registers, cleans up
// and unregisters again on each load. Re-enabling a real PWA cache = a new,
// deliberate sw.js (see docs/devnotes/2026-10-06-schedule-odds-freshness.md).

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith('pare-')).map((n) => caches.delete(n)));
      await self.registration.unregister();
    })(),
  );
});

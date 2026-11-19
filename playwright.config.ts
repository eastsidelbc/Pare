/**
 * Playwright. Two modes:
 * - Local (Kobe's dev box): runs against the dev server on :4000, reusing one that's
 *   already up (`reuseExistingServer`), else starting `npm run dev`.
 * - CI (`CI` env set by GitHub Actions, `e2e` job in .github/workflows/ci.yml): builds and
 *   starts the PRODUCTION app on a throwaway runner, never reuses a server, so every push is
 *   browser-tested on the real build before it reaches the Mac mini.
 * My Team specs mock /api/myteam/* with synthetic fixtures (e2e/myteam.spec.ts), so no Sleeper calls.
 * Never run this on the Mac mini: :4000 there is production.
 */
import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // One worker: Turbopack dev compiles routes on first hit; parallel cold hits just time out.
  workers: 1,
  // CI also writes an HTML report, uploaded as a run artifact when a test fails.
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4000',
    trace: 'retain-on-failure',
    browserName: 'chromium',
  },
  projects: [
    { name: 'iphone-393', use: { viewport: { width: 393, height: 759 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
    { name: 'ipad-834', use: { viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
  webServer: isCI
    ? {
        command: 'npm run build && npm run start',
        url: 'http://localhost:4000',
        reuseExistingServer: false,
        timeout: 300_000, // build + start on a cold runner
      }
    : {
        command: 'npm run dev',
        url: 'http://localhost:4000',
        reuseExistingServer: true,
        timeout: 180_000,
      },
});

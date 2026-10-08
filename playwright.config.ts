/**
 * Playwright — local only (plan Q10: added to CI before App Store submission).
 * Runs against the dev server on :4000, reusing one that's already up
 * (`reuseExistingServer`), else starting `npm run dev`. My Team specs mock
 * /api/myteam/* with synthetic fixtures (e2e/myteam.spec.ts) — no Sleeper calls.
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // One worker: Turbopack dev compiles routes on first hit; parallel cold hits just time out.
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4000',
    trace: 'retain-on-failure',
    browserName: 'chromium',
  },
  projects: [
    { name: 'iphone-393', use: { viewport: { width: 393, height: 759 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
    { name: 'ipad-834', use: { viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4000',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});

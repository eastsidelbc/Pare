// Leans look-check shooter (temporary tool — not in package.json). Uses the repo's
// installed playwright. Usage: node shoot.mjs <outDir> <label,...|all>
import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Users/Soy/Documents/Repos/Pare/package.json')('playwright');
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:4100';
const [outDir, which = 'all'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const PROPS = {
  v: 1,
  props: [
    { id: 'seed-cook', gameId: '2026-w6-BUF-LV', week: 6, playerId: '8138', playerName: 'James Cook', position: 'RB', team: 'BUF', opp: 'LV', home: false, stat: 'rush_yd', side: 'over', line: 85.5, createdAt: '2026-10-14T12:00:00.000Z' },
    { id: 'seed-coleman', gameId: '2026-w6-BUF-LV', week: 6, playerId: '11637', playerName: 'Keon Coleman', position: 'WR', team: 'BUF', opp: 'LV', home: false, stat: 'rec_yd', side: 'over', line: 45.5, createdAt: '2026-10-14T12:01:00.000Z' },
  ],
};
const GAME = '/leans/2026-w6-BUF-LV';
const settle = async (page) => {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForFunction(() => !document.body.innerText.includes('Checking the data'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(900);
};

const SHOTS = {
  'A2-nav': { path: '/', h: 852 },
  'A2-bets-list': { path: '/leans', h: 852 },
  'A2b-bets-list-saved': { path: '/leans', h: 852, seed: true },
  'A2b-G2-closed': { path: GAME, h: 1500, seed: true },
  'A2b-G2-open': { path: GAME, h: 2100, seed: true, act: async (p) => { await p.getByRole('button', { name: /Compare these teams/ }).click(); await p.waitForTimeout(800); } },
  'B2-game-line-lean': { path: GAME, h: 900, act: async (p) => { await p.locator('[data-line-row="total"] button').first().click(); await p.waitForTimeout(500); } },
  'B2-empty': { path: GAME, h: 900 },
  'B2-add-line': { path: `${GAME}?add=1`, h: 852, act: async (p) => { await p.waitForTimeout(400); const pick = p.getByRole('button', { name: /James Cook/ }).first(); if (await pick.count()) { await pick.click(); await p.waitForTimeout(400); } const f = p.getByLabel(/Line/).first(); if (await f.count()) { await f.fill('85.5'); } await p.waitForTimeout(500); } },
  'B2-prop-lean-over': { path: '/leans/prop/seed-cook', h: 900, seed: true },
  'B2-no-lean': { path: '/leans/prop/seed-coleman', h: 900, seed: true },
  'B1-player-picker': { path: `${GAME}?pick=1`, h: 852, act: async (p) => { await p.waitForTimeout(400); const s = p.getByRole('searchbox').first(); if (await s.count()) await s.fill('coo'); await p.waitForTimeout(500); } },
  'B1-player-vs-defense': { path: '/leans/player/8138?game=2026-w6-BUF-LV', h: 900 },
};

const browser = await chromium.launch();
try {
  for (const [label, s] of Object.entries(SHOTS)) {
    if (which !== 'all' && !which.split(',').includes(label)) continue;
    const ctx = await browser.newContext({
      viewport: { width: 393, height: s.h },
      deviceScaleFactor: 2,
      colorScheme: 'dark',
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Pare-iOS/1.0',
    });
    await ctx.addInitScript((seed) => {
      try {
        localStorage.setItem('pare:favorites', JSON.stringify({ version: 1, teams: [], pin: true, glow: true, onboarded: true }));
        if (seed) localStorage.setItem('pare:leans-props:v1', seed);
      } catch {}
    }, s.seed ? JSON.stringify(PROPS) : null);
    const page = await ctx.newPage();
    await page.goto(BASE + s.path, { waitUntil: 'domcontentloaded' });
    await settle(page);
    if (s.act) await s.act(page);
    await page.screenshot({ path: join(outDir, `${label}.png`) });
    console.log('shot', label);
    await ctx.close();
  }
} finally {
  await browser.close();
}

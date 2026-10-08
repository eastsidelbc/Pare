/**
 * My Team (Fantasy tab) — P5 machine gate (docs/plans/my-team-fantasy.md).
 * Both projects: iphone-393, ipad-834. /api/myteam/* is mocked with the
 * synthetic sandbox bundle (no real user data, no Sleeper calls).
 */
import { expect, test, type Page } from '@playwright/test';
import { buildSandboxBundle, SANDBOX_LEAGUES } from '../lib/myteam/sandboxBundle';

const [LEAGUE_A, LEAGUE_B] = SANDBOX_LEAGUES;
const USER_ID = '100000000000000001';
const USER = {
  user: { provider: 'sleeper', userId: USER_ID, username: 'user_1', displayName: 'User 1' },
  season: 2026,
  leagues: SANDBOX_LEAGUES,
};

async function mockApi(page: Page) {
  await page.route(/\/api\/myteam\/user\?/, (route) => {
    const u = new URL(route.request().url()).searchParams.get('u');
    if (u === 'nobody_here') return route.fulfill({ status: 404, json: { error: 'not_found' } });
    return route.fulfill({ json: USER });
  });
  await page.route(/\/api\/myteam\/league\?/, (route) => {
    const id = new URL(route.request().url()).searchParams.get('id');
    const bundle = buildSandboxBundle();
    if (id === LEAGUE_B.leagueId) bundle.league = { ...bundle.league, ...LEAGUE_B };
    return route.fulfill({ json: bundle });
  });
}

/** A device that already linked user_1 + League A (only if nothing is saved, so reloads keep changes). */
async function seedLinked(page: Page) {
  await page.addInitScript(
    ({ leagueId, userId }) => {
      if (!localStorage.getItem('pare:myteam')) {
        localStorage.setItem(
          'pare:myteam',
          JSON.stringify({ version: 1, provider: 'sleeper', username: 'user_1', userId, leagueId, window: 'season', irOpen: false }),
        );
      }
    },
    { leagueId: LEAGUE_A.leagueId, userId: USER_ID },
  );
}

async function openRoster(page: Page) {
  await mockApi(page);
  await seedLinked(page);
  await page.goto('/myteam');
  await expect(page.locator('[data-state="roster"]')).toBeVisible();
}

const row = (page: Page, name: string) => page.locator('li[data-player]').filter({ has: page.getByText(name, { exact: true }) }).first();
const rowButton = (page: Page, name: string) => row(page, name).locator('button[aria-expanded]').first();

/** Interactive elements (outside the site footer) smaller than 44×44, counting `.pare-hit44` tap zones. */
async function smallTargets(page: Page, scope?: string): Promise<string[]> {
  return page.evaluate((scopeSel) => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [role="button"]'))) {
      if (el.closest('.site-footer') || el.closest('[inert]')) continue;
      if (scopeSel && !el.closest(scopeSel)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') continue;
      let h = r.height;
      if (el.classList.contains('pare-hit44')) h = Math.max(h, parseFloat(getComputedStyle(el, '::after').height) || 0);
      if (h < 43.5 || r.width < 43.5) {
        const name = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40);
        out.push(`${el.tagName.toLowerCase()} "${name}" ${Math.round(r.width)}x${Math.round(h)}`);
      }
    }
    return out;
  }, scope ?? null);
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      main: main ? main.scrollWidth - main.clientWidth : 0,
    };
  });
  expect(overflow).toEqual({ doc: 0, main: 0 });
}

const NAV_TABS = ['Home', 'Compare', 'Standings', 'Leaders', 'Fantasy'];

async function checkNav(page: Page) {
  const nav = page.locator('nav[aria-label="Primary"]');
  await expect(nav).toBeVisible();
  const links = nav.locator('a');
  await expect(links).toHaveCount(5);
  for (let i = 0; i < NAV_TABS.length; i++) {
    const link = links.nth(i);
    await expect(link).toHaveAccessibleName(NAV_TABS[i]);
    // Stacked: icon above the visible label.
    const icon = await link.locator('svg').boundingBox();
    const label = await link.getByText(NAV_TABS[i], { exact: true }).last().boundingBox();
    expect(icon && label && icon.y + icon.height <= label.y + 1).toBeTruthy();
  }
  const pillH = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--nav-pill-h').trim());
  const navH = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--nav-h').trim());
  expect([pillH, navH]).toEqual(['58px', '78px']);
  expect(await smallTargets(page, 'nav[aria-label="Primary"]')).toEqual([]);
}

test.describe('5-tab nav', () => {
  for (const path of ['/', '/compare', '/myteam']) {
    test(`nav on ${path}: 5 labelled stacked tabs, ≥44px`, async ({ page }) => {
      await mockApi(page);
      await page.goto(path);
      await checkNav(page);
    });
  }
});

test.describe('My Team', () => {
  test('inline onboarding → league → roster', async ({ page }) => {
    await mockApi(page);
    await page.goto('/myteam');
    const card = page.locator('[data-state="onboarding-entry"]');
    await expect(card).toBeVisible();
    await expect(page.getByText('Your starters, bench and IR / Taxi show up here.')).toBeVisible();
    await noHorizontalScroll(page);
    expect(await smallTargets(page)).toEqual([]);

    const input = page.getByLabel('Sleeper username');
    await input.fill('bad name!');
    await page.getByRole('button', { name: 'Continue' }).click();
    // (Next's route announcer is also role=alert — match ours by its text.)
    await expect(page.getByRole('alert').filter({ hasText: 'letters, numbers' })).toBeVisible();

    await input.fill('nobody_here');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('[data-state="onboarding-notfound"]')).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'No Sleeper user' })).toBeVisible();

    await page.getByLabel('Sleeper username').fill('user_1');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('[data-state="onboarding-pickleague"]')).toBeVisible();
    await page.getByRole('button', { name: new RegExp(`^${LEAGUE_A.name}`) }).click();
    await expect(page.locator('[data-state="roster"]')).toBeVisible();
    await expect(page.getByRole('button', { name: `League: ${LEAGUE_A.name}. Change league` })).toBeVisible();
  });

  test('league sheet switch persists after reload', async ({ page }) => {
    await openRoster(page);
    await page.getByRole('button', { name: `League: ${LEAGUE_A.name}. Change league` }).click();
    const sheet = page.getByRole('dialog', { name: 'Your leagues' });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: new RegExp(LEAGUE_B.name) }).click();
    await expect(page.getByRole('button', { name: `League: ${LEAGUE_B.name}. Change league` })).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-state="roster"]')).toBeVisible();
    await expect(page.getByRole('button', { name: `League: ${LEAGUE_B.name}. Change league` })).toBeVisible();
  });

  test('roster: IR / TAXI open, meters labelled, two rows open, no h-scroll, ≥44px targets', async ({ page }) => {
    await openRoster(page);
    // IR / TAXI is always open — its rows show without a tap.
    const reserve = page.locator('section[data-section="reserve"]');
    await expect(reserve).toBeVisible();
    await expect(reserve.locator('li[data-player]')).toHaveCount(2);
    await expect(reserve.getByText('Isaiah Cole', { exact: true })).toBeVisible();

    // Every meter / week cell carries text, never color alone.
    const unlabelled = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-tier], [data-bye]')).filter((el) => !(el.textContent ?? '').trim()).length,
    );
    expect(unlabelled).toBe(0);
    expect(await page.locator('[data-tier]').count()).toBeGreaterThan(10);

    await rowButton(page, 'Jordan Hale').click();
    await rowButton(page, 'Marcus Reed').click();
    await expect(page.locator('[data-state="expanded"]')).toHaveCount(2);
    await expect(rowButton(page, 'Jordan Hale')).toHaveAttribute('aria-expanded', 'true');
    await expect(rowButton(page, 'Marcus Reed')).toHaveAttribute('aria-expanded', 'true');

    await page.getByRole('button', { name: 'Expand all' }).click();
    await noHorizontalScroll(page);
    expect(await smallTargets(page)).toEqual([]);
  });

  test('Season ⇄ Last 4 changes meter text; ⓘ opens its note', async ({ page }) => {
    await openRoster(page);
    const meters = page.locator('section[data-section="starters"] button[aria-expanded] [data-tier]');
    const season = (await meters.allTextContents()).join('|');
    await page.getByRole('button', { name: 'Last 4', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Last 4', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await meters.allTextContents()).join('|')).not.toBe(season);

    await expect(page.locator('[data-state="window-note"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'About Season and Last 4' }).click();
    await expect(page.locator('[data-state="window-note"]')).toContainText('byes skipped');
  });

  test('Start / Sit slides and shows chips + "not a projection" (phone)', async ({ page }, info) => {
    test.skip(info.project.name !== 'iphone-393', 'Start / Sit lives on the phone action row; iPad uses Pin to side + Compare');
    await openRoster(page);
    await rowButton(page, 'Marcus Reed').click();
    const card = row(page, 'Marcus Reed');
    await card.getByRole('button', { name: /^Start \/ Sit/ }).click();
    const panel = card.locator('[data-state="start-sit"]');
    await expect(panel).toBeVisible();
    await expect(panel.getByText(/not a projection/)).toBeVisible();
    // Chips of my other RBs, likely swap (first bench RB) pre-picked.
    const chips = panel.getByRole('group', { name: /Compare with another RB/ }).getByRole('button');
    await expect(chips).toHaveCount(3);
    await expect(chips.filter({ hasText: 'Chris Nolan' })).toHaveAttribute('aria-pressed', 'true');
    // The card's button area slid one panel to the left.
    const tx = await card.locator('.pare-slide').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    expect(tx).toBeLessThan(0);
    expect(await smallTargets(page, 'li[data-player]')).toEqual([]);
    await panel.getByRole('button', { name: 'Back' }).click();
    await expect(card.getByRole('button', { name: /^Start \/ Sit/ })).toBeVisible();
  });

  test('Open in Compare lands on /compare with the right pair and reuses the tab', async ({ page }, info) => {
    await openRoster(page);
    const phone = info.project.name === 'iphone-393';
    const open = async () => {
      await rowButton(page, 'Jordan Hale').click();
      const card = row(page, 'Jordan Hale');
      const button = phone ? card.getByRole('button', { name: /^Open in Compare · KC vs / }) : card.getByRole('button', { name: /^Compare KC vs / });
      await button.click();
      await page.waitForURL('**/compare');
    };
    type Saved = { activeId: string; comparisons: Array<{ id: string; teamA: string; teamB: string }> };
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('pare:comparisons') ?? 'null') as Saved | null);
    // The comparisons store persists on a 150ms debounce — poll until the active tab is KC vs BAL.
    const activePair = async () => {
      const s = await saved();
      const a = s?.comparisons.find((c) => c.id === s.activeId);
      return a ? [a.teamA, a.teamB].sort().join(' / ') : null;
    };
    const PAIR = 'Baltimore Ravens / Kansas City Chiefs';

    await open();
    await expect.poll(activePair).toBe(PAIR);
    const first = await saved();

    await page.goto('/myteam');
    await expect(page.locator('[data-state="roster"]')).toBeVisible();
    await open();
    await expect.poll(activePair).toBe(PAIR);
    const second = await saved();
    expect(second?.comparisons.length).toBe(first?.comparisons.length);
    expect(second?.activeId).toBe(first?.activeId);
  });

  test('iPad: Pin to side adds a card to the PINNED panel', async ({ page }, info) => {
    test.skip(info.project.name !== 'ipad-834', 'The PINNED panel is the iPad layout');
    await openRoster(page);
    const panel = page.getByRole('complementary', { name: 'Pinned players' });
    await expect(panel).toBeVisible();
    await expect(panel.locator('li[data-pinned]')).toHaveCount(0);

    await rowButton(page, 'Sam Ortiz').click();
    await row(page, 'Sam Ortiz').getByRole('button', { name: 'Pin to side' }).click();
    const pinned = panel.locator('li[data-pinned]');
    await expect(pinned).toHaveCount(1);
    await expect(pinned.first()).toContainText('Sam Ortiz');

    // Starts short; a tap opens pts/g + Open in Compare.
    await expect(pinned.first().getByRole('button', { name: /^Open in Compare/ })).toHaveCount(0);
    await pinned.first().locator('button[aria-expanded]').click();
    await expect(pinned.first().getByRole('button', { name: /^Open in Compare/ })).toBeVisible();
    expect(await smallTargets(page)).toEqual([]);
    await noHorizontalScroll(page);

    await pinned.first().getByRole('button', { name: 'Unpin Sam Ortiz' }).click();
    await expect(pinned).toHaveCount(0);
  });
});

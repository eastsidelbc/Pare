import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  resolveTeamIdentityMode,
  teamLogoSrc,
  DARK_LOGOS,
  TEAM_IDENTITY,
  type TeamIdentityConfig,
} from '@/config/teamIdentity';
import { NFL_TEAMS, getTeamByAbbr } from '@/lib/teams';

// TeamIdentity reads the live switch; mock just the mode so these tests hold
// whichever way TEAM_IDENTITY.default is flipped.
const mode = vi.hoisted(() => ({ value: 'logo' as 'logo' | 'name' }));
vi.mock('@/config/teamIdentity', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/config/teamIdentity')>();
  return { ...real, getTeamIdentityMode: () => mode.value };
});
const { default: TeamIdentity } = await import('@/components/ui/TeamIdentity');

describe('resolveTeamIdentityMode', () => {
  const cfg: TeamIdentityConfig = { default: 'logo', overrides: { compareHero: 'name' } };
  it('no override → default', () => expect(resolveTeamIdentityMode(cfg, 'standings')).toBe('logo'));
  it('override wins', () => expect(resolveTeamIdentityMode(cfg, 'compareHero')).toBe('name'));
  it('default name flips every non-overridden surface', () =>
    expect(resolveTeamIdentityMode({ default: 'name', overrides: {} }, 'home')).toBe('name'));
  it('live config keeps the Compare hero on wordmarks', () =>
    expect(resolveTeamIdentityMode(TEAM_IDENTITY, 'compareHero')).toBe('name'));
});

describe('logo assets', () => {
  it('all 32 teams have a local SVG', () => {
    for (const t of NFL_TEAMS) {
      expect(existsSync(join(process.cwd(), 'public', teamLogoSrc(t.name))), t.name).toBe(true);
    }
  });
  it('DARK_LOGOS only lists real abbreviations', () => {
    for (const abbr of DARK_LOGOS) expect(getTeamByAbbr(abbr), abbr).not.toBeNull();
  });
});

describe('<TeamIdentity>', () => {
  const NAME = createElement('span', { className: 'abbr' }, 'KC');
  // children as a prop: createElement's 3rd-arg form can't satisfy a *required* `children` type.
  const render = (abbr: string, extra: { decorative?: boolean; slot?: number; withName?: boolean } = {}) =>
    // eslint-disable-next-line react/no-children-prop
    renderToStaticMarkup(createElement(TeamIdentity, { abbr, surface: 'home', size: 24, ...extra, children: NAME }));

  beforeEach(() => { mode.value = 'logo'; });

  it('logo mode → sized lazy img with the full team name as alt', () => {
    const html = render('KC');
    expect(html).toContain('src="/images/nfl-logos/kansas-city-chiefs.svg"');
    expect(html).toContain('alt="Kansas City Chiefs"');
    expect(html).toContain('width="24"');
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain('class="abbr"');
  });
  it('slot → logo centered in a fixed-width box', () =>
    expect(render('KC', { slot: 35 })).toMatch(/^<span[^>]*width:35px[^>]*><img /));
  it('slot is ignored in name mode', () => {
    mode.value = 'name';
    expect(render('KC', { slot: 35 })).toBe('<span class="abbr">KC</span>');
  });
  it('withName → logo then the name markup', () =>
    expect(render('KC', { withName: true })).toMatch(/^<img [^>]*\/><span class="abbr">KC<\/span>$/));
  it('withName in name mode → name markup only', () => {
    mode.value = 'name';
    expect(render('KC', { withName: true })).toBe('<span class="abbr">KC</span>');
  });
  it('decorative → empty alt', () => expect(render('KC', { decorative: true })).toContain('alt=""'));
  it('dark logo gets the halo, light logo does not', () => {
    expect(render('LV')).toContain('var(--logo-halo)');
    expect(render('KC')).not.toContain('--logo-halo');
  });
  it('ESPN legacy abbr resolves (WSH → Commanders)', () =>
    expect(render('WSH')).toContain('washington-commanders.svg'));
  it('unknown team → name markup', () => expect(render('XXX')).toBe('<span class="abbr">KC</span>'));
  it('name mode → children exactly, no img', () => {
    mode.value = 'name';
    expect(render('KC')).toBe('<span class="abbr">KC</span>');
  });
});

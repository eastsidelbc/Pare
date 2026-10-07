# 2026-10-06 — Site footer + /about + in-app detector

Branch `chore/footer-about`. CHANGELOG `[Unreleased] → Added`.

## What
- `components/SiteFooter.tsx` — two variants by CSS width (`lg` = 1024px): full footer on desktop, a one-line "© {year} Pare LLC · About" below. Rendered as the last child of each tab's single scroll `<main>` (Home `ScheduleScreen`, `StandingsScreen`, Leaders page, About page). Never fixed, never in BottomNav.
- `app/about/page.tsx` — H1 Inline shell (Pare + gold-bright ABOUT), deep card, static.
- `lib/platform.ts` — in-app detector. Styles in `app/globals.css` (`.site-footer*`).

## Decisions
- **UA token is `Pare-iOS`, not `PareApp`.** The task spec said `PareApp`, but the wrapper actually sends `Pare-iOS/<ver> (iPhone; iOS <x>)` (`WebViewContainer.swift`), and the iOS docs already use `Pare-iOS`. `PareApp` would never match.
- **Client-side marker, not `headers()`.** Reading the UA on the server would make every page dynamic (Leaders/Home lose ISR). An inline head script sets `data-app="ios"` before first paint, so there's no flash; `<html suppressHydrationWarning>` already covers the attribute. Build output confirms `/`, `/leaderboards`, `/about` = ○ static, 5 min revalidate. (`/standings` was already ƒ via `force-dynamic` — unchanged.)
- **Not on Compare.** It's a no-scroll fit screen at 393×759; there's no end of content to put a footer at.
- **Legal column hidden** — Privacy/Terms routes don't exist yet. Add entries to `COLUMNS` in `SiteFooter.tsx` when they ship.
- **Home is infinite-scroll downward** (weeks append near the bottom), so the footer sits below the loaded weeks and is "final" only once the last week has loaded. Standard feed behaviour; accepted.
- **Year** comes from `new Date()` at render: static pages re-render every 5 min (ISR), so it rolls over within minutes of New Year.

## Privacy audit (backs `/privacy`)
Searched `app components lib utils config public` for external URLs, storage APIs and request logging.

| Area | Finding |
|---|---|
| Browser → third-party | **ESPN `site.api.espn.com`**: scoreboard polled every 15s in the live window (`lib/hooks/useLiveScores.ts`) and the game `summary` when a final's box score opens (`lib/hooks/useGameSummary.ts`). ESPN sees visitor IP + UA (+ `pare.gg` origin as Referer, per `strict-origin-when-cross-origin`). Nothing else |
| Server → third-party | ESPN (`site.api`, `sports.core.api`, `site.web.api`), Sleeper `api.sleeper.app`. No visitor data passed |
| Fonts | `next/font/google` — downloaded at build, self-hosted; no runtime Google request |
| Images | Team logos local `/images/nfl-logos/*.svg`. ESPN logo/headshot URLs exist in data (`lib/fantasy.ts`, `lib/leaders.ts`) but aren't rendered |
| Scripts / analytics / ads | None |
| localStorage | `pare:favorites`, `pare:comparisons`. No sessionStorage, IndexedDB or cookies set by the app |
| Service worker | `public/sw.js` kill switch only deletes `pare-*` caches; registration off on pare.gg |
| Server logs | App never reads IP / UA headers; no request logging. Cloudflare (edge) processes IPs on its side |
| `/api/preferences` | Stub — returns `{}`, stores nothing |

Spec said "stats are fetched by our server, not your device" — false for live scores / box scores, so the policy discloses ESPN instead.

## Verify
`npm run check`, `npm run test:run` (121 pass), `npm run build` (in a scratch copy — dev was running on :4000). Built HTML for `/`, `/leaderboards`, `/about` contains the footer + the in-app script.

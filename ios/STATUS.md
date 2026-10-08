# iOS status (updated after every phase)
2026-10-08 · branch `feat/ios-shell` · Mac mini `~/Pare-ios` · **Phase: H3 partial — rest DEFERRED until My Team is deployed to pare.gg** (Fantasy tab, /about, /privacy)

## Gates
- H1 ✅ (after `1221898`) · P1 ✅ 38/38 · P2 ✅ (`npm run check` exit 0, 121/121 tests) · H2 ✅ Info.plist wired, iPhone portrait only (Debug + Release)
- H3 🟡 device setup done: runs on Kobe's **iPhone 14 Pro (iOS 18.6.2)**, Personal Team, `gg.pare.app.dev`, loads pare.gg

## Last build (Xcode 26.3, Debug, at `9913cc2`)
- iPhone 17 + iPad Pro 11-inch (M5) sims (iOS 26.3.1): **BUILD SUCCEEDED**, 0 errors, 0 Swift warnings · iPhone 14 Pro (device): runs
- UA ends `Mobile/15E148 Pare-iOS/1.0` · sim screenshot `ios/sim-check.png` (not committed)

## Commits
`1221898` stray Pare/ · `f7a7f03` shell · `4daeb6e` resources · `f4b5fb4` docs · `43a0533` H2 · `9913cc2` UA · `0f7f151` STATUS · + `docs(ios): H3 partial`

## Remaining H3 (14 Pro, after My Team deploys; re-run ⌘R first, since Personal-team builds expire in 7 days)
1. Launch: BgDeep → pare.gg, no white flash; light status bar; header clears the notch, nav pill clears the home indicator.
2. Footer hidden: Web Inspector → `document.documentElement.dataset.app === 'ios'`.
3. No bounce / pull-to-refresh, edge swipe does nothing, all 5 tabs work (incl. **Fantasy**), Compare tabs survive force-quit.
4. ESPN/Sleeper link → Safari sheet; `mailto` → Mail.
5. Airplane mode + cold launch → OfflineView; Retry works; foregrounding while offline auto-retries.
6. Bridge (console lines in `ios/README.md`): `openSettings` → sheet; `share` `/compare?away=KC&home=BUF` → share sheet;
   `haptic` all 7 styles felt; `{type:'eval'}` + off-host share URL → ignored.
7. Settings: **About / Privacy** load in the main view, email opens Mail, version + disclaimer visible.
8. iPad Pro 11" sim: share popover (no crash), rotation + Split View keep the layout.

## Pre-submission items
- **Perf:** Xcode log on device shows `Too many messages … DrawingArea_AcceleratedAnimationDidStart`. That's WebKit
  flagging a flood of GPU animation starts from the page. Check for animations that never settle (design-system §9.8: no infinite
  loops at rest) via Web Inspector → `document.getAnimations().length` on a resting screen. Fix on the web side if non-zero.
- App Store blockers (4.2, data licensing, live/box scores via our API, Phase S first): `docs/devnotes/2026-10-08-ios-shell.md`.

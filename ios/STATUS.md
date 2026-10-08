# iOS status (updated after every phase)
2026-10-08 · branch `feat/ios-shell` · Mac mini `~/Pare-ios` · **Phase: H2 ✅ done → next: H3 (Kobe, real iPhone 14 Pro)**

## Gates
- H1 ✅ (after `1221898` removed the stray `Pare/` copy) · P1 ✅ 38/38 · P2 ✅ (`npm run check` exit 0, 121/121 tests)
- H2 ✅ `INFOPLIST_FILE = Config/Info.plist`, launch-screen generation NO, iPhone portrait only (Debug + Release)

## Last build (Xcode 26.3, Debug, at `9913cc2`)
- iPhone 17 (iOS 26.3.1): **BUILD SUCCEEDED**, 0 errors, 0 Swift warnings
- iPad Pro 11-inch (M5) (iOS 26.3.1): **BUILD SUCCEEDED**, 0 errors, 0 Swift warnings
- Built Info.plist: launch color BgDeep, Dark, encryption NO, iPhone portrait only. UA ends `Mobile/15E148 Pare-iOS/1.0`
- iPhone 17 sim launch: pare.gg loads dark, clears the Dynamic Island (`ios/sim-check.png`, not committed)

## Commits (local, Kobe pushes)
`1221898` stray Pare/ · `f7a7f03` shell · `4daeb6e` resources · `f4b5fb4` docs · `43a0533` H2 wiring · `9913cc2` UA · + `docs(ios): STATUS`

## Kobe: H3 on the real iPhone 14 Pro
1. `cd ~/Pare-ios` → `git push` (baton).
2. iPhone: Settings → Privacy & Security → **Developer Mode** on (it restarts). Plug it into the Mac mini.
3. `open ios/Pare.xcodeproj` → target Pare → Signing & Capabilities → Team = **jeremy@pare.gg Personal Team** (bundle stays `gg.pare.app.dev`).
4. Pick the iPhone as run destination → ⌘R. If iOS blocks it: Settings → General → **VPN & Device Management** → trust.
5. Walk the H3 list in `docs/plans/2026-10-08-ios-shell.md`: no white flash, footer hidden, no bounce/swipe-back,
   ESPN link → Safari sheet, airplane mode → offline screen + Retry, Settings sheet links.
6. Bridge: Mac Safari → Develop → iPhone → pare.gg → Console → paste the 3 `postMessage` lines from `ios/README.md`
   (feel all 7 haptic styles). iPad share popover: same test on the iPad Pro 11-inch sim.
7. Send results/bugs to Claude → STATUS gets updated. Personal-team builds expire in 7 days: re-run ⌘R.

# Pare iOS: runbook

The single source for the iOS app. CLAUDE.md links here; the plan and its phase status live in
`docs/plans/2026-10-08-ios-shell.md`, and the why lives in `docs/adr/2026-10-08-ios-shell-v1.md`.

## What the shell is

A minimal **SwiftUI + WKWebView** app that shows https://pare.gg full screen. The web app already
is a fixed app shell (header, 5-tab nav pill, safe areas), so the native side only adds what a
browser can't: no white flash, no rubber-band, external links in a Safari sheet, an offline
screen, a native Settings sheet, and a tiny message bridge (share, haptics, settings).
There's no native tab bar, no XcodeGen and no Capacitor. iPhone + iPad, dark only, iOS 17+.

```
ios/
  README.md               ← this runbook
  Pare.xcodeproj/         ← Xcode 26 project. Source of truth, edited in the Xcode UI only
  Config/Info.plist       ← extra Info.plist keys (launch color, dark style, encryption flag)
  Pare/                   ← synchronized folder: every file in here builds automatically
    PareApp.swift         @main app + ShellState (@Observable, one per window) + RootView
    AppConfig.swift       homeURL, inAppHosts, uaToken "Pare-iOS", bridgeName "pare", supportEmail, version
    WebView.swift         PareWebView (UIViewRepresentable) + Coordinator (link rules, offline) + presentFromTop
    Bridge.swift          WKScriptMessageHandler: allow-list share | haptic | openSettings
    SettingsView.swift    About, Privacy, support@pare.gg, version, NFL disclaimer
    OfflineView.swift     "You're offline" + Retry
    PrivacyInfo.xcprivacy privacy manifest (matches the App Store privacy label)
    Assets.xcassets/      AppIcon, AccentColor = --gold #d4a843, BgDeep = --bg-deep #0a0d14
```

How the pieces connect: `PareApp → RootView → PareWebView`. `OfflineView` and the `SettingsView`
sheet sit on top, driven by `ShellState`. `Bridge` receives the page's messages and flips the same state.

## Workflow

- **`~/Pare` on the Mac mini is production.** It stays on main ONLY and is used only for
  deploys (`git pull` → build → `pm2 restart pare`). Never switch branches there.
- **iOS work happens in a separate clone, `~/Pare-ios`** (one-time setup):
  ```
  git -C ~/Pare remote get-url origin
  git clone <url> ~/Pare-ios
  cd ~/Pare-ios
  git switch feat/ios-shell
  ```
- **Baton rule:** push before leaving a machine, pull before starting on the other.
  Only one machine holds the baton (has unpushed work) at a time.
- **Prerequisite:** macOS Sequoia 15.6+ with Xcode 26.3 (from developer.apple.com/download/all — the Mac App Store only offers the newest Xcode, which needs Tahoe), or Tahoe 26.2+ with current Xcode. Tahoe upgrade is deferred until after launch.
  (The Mac mini runs Sequoia 15.7.1 + Xcode 26.3.)
- **Real-device setup (iPhone 14 Pro):**
  1. Xcode → Settings → Accounts: sign in with **jeremy@pare.gg**. Target Pare → Signing & Capabilities → Team = its **Personal Team**.
  2. iPhone: Settings → Privacy & Security → **Developer Mode** on (the phone restarts).
  3. Plug in, pick the phone as the run destination, ⌘R.
  4. If iOS asks, trust the developer: Settings → General → **VPN & Device Management**.
  5. Personal-team builds expire after 7 days. Re-run from Xcode when the app stops opening.

### Bundle ID rule

- **Now:** `gg.pare.app.dev`, signed with the **Personal Team**.
- **Why:** a bundle ID used with a free Personal Team gets registered to that team and can block
  Pare LLC from registering it later. **Never put `gg.pare.app` on a Personal Team.**
- **Later (Phase S):** after Pare LLC's Developer Program enrollment is approved, switch to Team =
  Pare LLC, Bundle ID = `gg.pare.app`. Phase S must happen **before any archive/TestFlight** and
  **before Phase W** (universal links need `<TEAMID>.gg.pare.app`).

## How the project was made

Xcode 26 → New Project → iOS App (`Pare`, org `gg.pare`, SwiftUI, no tests, no storage), saved at
the repo root with source control unchecked. With Xcode closed, the outer `Pare/` folder was renamed
to `ios/`. The template `ContentView.swift` is in `_to-delete/2026-10-08-xcode-template/`.

## Rules

- Open **`ios/Pare.xcodeproj`** (no workspace, no generator).
- **Project settings change only in the Xcode UI.** Never hand-edit `project.pbxproj`. Commit it after UI changes.
- **Any file dropped in `ios/Pare/` builds automatically** (synchronized folder). That's why
  `Info.plist` lives in `ios/Config/`: inside `ios/Pare/` it would be copied *and* processed
  ("multiple commands produce Info.plist").
- **Never commit `xcuserdata`** or `*.xcuserstate` (`.gitignore` covers both; check `git status` before `git add ios`).
- Colors come from the asset catalog and match the web tokens (`BgDeep` = `--bg-deep`, `AccentColor` = `--gold`).
  Swift uses generated symbols (`Color(.bgDeep)`, `UIColor(resource: .bgDeep)`), so a wrong name fails the build.
- iOS 17.0 minimum: no iOS 26-only APIs. Our web view type is `PareWebView`, because iOS 26 ships its own SwiftUI `WebView`.

### Link rules (WebView.swift)

| Link | Goes to |
|---|---|
| https on `pare.gg` / `www.pare.gg` | stays in the app (also `target=_blank`, loaded in the main view) |
| `mailto:` / `tel:` | Mail / Phone |
| any other http(s) (ESPN, Sleeper, …) | Safari sheet (`SFSafariViewController`) |
| anything else | blocked |
| embedded frames | load normally; only the main view is locked to pare.gg |

### User agent: keep in sync

Swift sets `applicationNameForUserAgent = "Mobile/15E148 Pare-iOS/<version>"`. That value *replaces*
WebKit's default UA ending (`Mobile/15E148`), so we keep the standard token and add ours after it:
`Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Pare-iOS/1.0`
(iPad: desktop-class `Macintosh` UA, same token at the end).
The web detects the token in `lib/platform.ts` (`IOS_APP_UA_TOKEN`) and sets `<html data-app="ios">`,
which hides the site footer. **`AppConfig.uaToken` must equal `IOS_APP_UA_TOKEN`.** Change both or neither.

### Bridge: JS contract

One-way messages from the page to the app. Only the top-level frame on https pare.gg is trusted;
everything else (other hosts, iframes, unknown types, bad fields) is ignored.

```js
// share: url must be https on pare.gg; title optional, capped at 200 chars. iPad shows a popover.
window.webkit?.messageHandlers?.pare?.postMessage({ type: 'share', url: 'https://pare.gg/compare?away=KC&home=BUF', title: 'KC vs BUF' });
// haptic: light | medium | heavy | selection | success | warning | error (real device only)
window.webkit?.messageHandlers?.pare?.postMessage({ type: 'haptic', style: 'success' });
// openSettings: shows the native Settings sheet
window.webkit?.messageHandlers?.pare?.postMessage({ type: 'openSettings' });
```

The `?.` chain makes every call a no-op in a normal browser. Phase W adds a typed wrapper
(`lib/iosBridge.ts`) that mirrors `Bridge.swift`.

### Privacy manifest (PrivacyInfo.xcprivacy)

- No tracking. One collected type: **User ID** (linked, not tracking, app functionality). The Fantasy tab sends a Sleeper username to pare.gg.
- `NSPrivacyAccessedAPITypes` is empty: the shell uses no required-reason API.
  **If Swift ever uses `UserDefaults`, add the UserDefaults entry with reason `CA92.1`.**
- **Update this file whenever `/privacy` changes** (and the other way around).
- It has no `<!DOCTYPE>` line on purpose. Plists parse fine without one, and it keeps `ios/Pare/` free of `http://` strings (P1 gate).

## H2 checklist (Mac mini, Xcode UI)

**Done 2026-10-08 (`43a0533`):** steps 2–3 were applied directly in `project.pbxproj` with Xcode closed (Kobe-approved one-off).
Kept here as the reference for what those settings are. Current state: `ios/STATUS.md`.

1. `cd ~/Pare-ios` → `git pull`. Open `ios/Pare.xcodeproj`.
2. Click the blue **Pare** project → under TARGETS pick **Pare** → **Build Settings** → **All** + **Combined**.
   - Search `INFOPLIST_FILE` → **Info.plist File** → `Config/Info.plist`.
   - Search `UILaunchScreen_Generation` → **Generate Launch Screen** → `No`.
     (Otherwise Xcode generates an empty launch screen that fights the BgDeep one.)
   - Search `Development Assets`: it's **empty today**, so nothing to do. If it ever points to a missing `Preview Content` folder, clear it.
3. **General** tab → **Deployment Info** → iPhone orientation: **Portrait only** (uncheck Landscape Left + Right).
   H1 left them on; iPad keeps all four.
4. Optional tidy-up: under **PROJECT** Pare (not the target) → Build Settings → iOS Deployment Target shows 26.2.
   The target's 17.0 wins, so this is cosmetic. Set it to 17.0 if you like.
5. ⌘R on **iPhone 17** and **iPad Pro 11-inch (M5)** simulators.
6. `git status` should show only `ios/Pare.xcodeproj/project.pbxproj`. Commit `chore(ios): wire Info.plist + launch color` → push (baton).

Gate (after pull): `grep -c 'INFOPLIST_FILE = Config/Info.plist' ios/Pare.xcodeproj/project.pbxproj` ≥ 1.

## Build from the terminal

```
cd ~/Pare-ios/ios
xcrun simctl list devices available
xcodebuild -project Pare.xcodeproj -scheme Pare -destination "id=<UDID>" build
```

Use `id=<UDID>`. `name=…,OS=26.3` fails because the installed runtime reports `26.3.1`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Multiple commands produce …/Info.plist` | An `Info.plist` is inside `ios/Pare/`. Keep it in `ios/Config/` and point Info.plist File there. |
| Build error about a missing `Preview Content` / development asset path | Clear **Development Assets** (`DEVELOPMENT_ASSET_PATHS`) in Build Settings. |
| White flash or white launch screen | Check H2: Info.plist File = `Config/Info.plist` and Generate Launch Screen = No. |
| Weird errors after moving/renaming files, or old code running | Product → Clean Build Folder (⇧⌘K). If that's not enough, quit Xcode and delete `~/Library/Developer/Xcode/DerivedData/Pare-*`. |
| `Unable to find a device matching the provided destination specifier` | Use `-destination "id=<UDID>"` (see above). |
| App stops opening on the iPhone after a week | Personal-team build expired. Run from Xcode again. |
| Web Inspector: no device listed | Debug builds only. Safari → Settings → Advanced → "Show features for web developers", then Develop → device/simulator → pare.gg. |

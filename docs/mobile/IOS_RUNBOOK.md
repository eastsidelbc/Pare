# iOS Runbook for Pare NFL Comparison

**Date**: 2025-10-14  
**Project**: Pare NFL Team Comparison  
**Platform**: iOS 16.0+  
**Status**: ✅ Ready for Development

---

## Quick Start

### Prerequisites

1. **macOS** 13.0 (Ventura) or later
2. **Xcode** 15.0 or later
3. **Homebrew** (for package management)
4. **XcodeGen** (for project generation)
5. **Node.js** 18+ with npm
6. **Git** (for version control)

### First-Time Setup

```bash
# Clone repository (if needed)
cd ~/Documents/Pare

# Run setup script
cd ios
./Scripts/setup.sh
```

The setup script will:
- ✅ Check Xcode installation
- ✅ Install XcodeGen (via Homebrew)
- ✅ Install npm dependencies
- ✅ Generate Xcode project
- ✅ Verify app icon

---

## Development Workflow

### 1. Start Next.js Dev Server

```bash
# In project root
cd ~/Documents/Pare
npm run dev
```

**Expected output:**
```
  ▲ Next.js 15.5.4
  - Local:        http://localhost:4000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 2.3s
```

**Verify backend:**
```bash
curl http://localhost:4000/api/health | jq
```

### 2. Generate/Update Xcode Project

```bash
cd ios
./Scripts/gen_xcode.sh
```

**Note:** Run this whenever you:
- Add/remove Swift files
- Change `project.yml`
- Update xcconfig files
- Switch branches with iOS changes

### 3. Open in Xcode

```bash
open Pare.xcodeproj
```

**Or** from Finder:
1. Navigate to `~/Documents/Pare/ios/`
2. Double-click `Pare.xcodeproj`

### 4. Configure Xcode

#### Select Scheme
1. Click scheme dropdown (top left, near ▶)
2. Select **Pare-Debug** for development
3. Select **Pare-Release** for production testing

#### Select Destination
1. Click destination dropdown (right of scheme)
2. Select **iPhone 15** (or any iOS 16+ simulator)
3. For physical device: Connect via USB, select device

#### Code Signing (if needed)
1. Select project in navigator
2. Select **Pare** target
3. Go to **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Select your **Team** (if you have one)

**Note:** For Simulator testing, signing is not required.

### 5. Build and Run

**Keyboard:** `⌘R`

**Or:** Click ▶ button in toolbar

**First build:** May take 2-3 minutes (compiling Swift)

**Subsequent builds:** 10-30 seconds

---

## Expected Behavior

### On Launch

1. **App Icon**: Pare icon appears on home screen
2. **Splash Screen**: Brief loading screen
3. **Main UI**: Bottom tab bar with 3 tabs
4. **Progress Bar**: Horizontal blue bar while loading
5. **Web Content**: Loads `http://localhost:4000/compare`
6. **Teams Display**: Shows offense/defense panels

### Home Tab

- **Content**: Full WKWebView showing Pare NFL comparison
- **Progress**: Top progress bar (3px blue line)
- **Navigation**: Back/forward gestures work
- **Pull-to-Refresh**: Pull down to reload (if enabled in Settings)
- **Smooth Scrolling**: Native iOS momentum scrolling

### Settings Tab

- **Environment**: Switch between Dev (localhost:4000) and Prod
- **Pull to Refresh**: Toggle on/off
- **Open Links Externally**: Toggle on/off
- **Clear Web Cache**: Button to clear all cached data
- **Go to Home**: Reset to `/compare` route
- **Open in Safari**: Opens current page in Safari
- **App Info**: Version, bundle ID, build type

### Debug Tab

- **Current State**: URL, title, loading status, progress
- **Navigation**: Back, Forward, Reload buttons
- **WebView Info**: User agent, environment, base URL
- **Debug Actions**: Reset WebView state, print debug info
- **Console Logs**: JavaScript logs relayed via bridge (future)

---

## Testing Checklist

### Basic Functionality

- [ ] App launches without crashing
- [ ] Home tab loads web content
- [ ] Progress bar animates during load
- [ ] Bottom tabs switch correctly
- [ ] Settings can be changed
- [ ] Debug info displays correctly

### Web Integration

- [ ] Web app loads at `localhost:4000/compare`
- [ ] Team selection dropdowns work
- [ ] Offense/Defense panels display
- [ ] Metric bars render correctly
- [ ] Mobile responsive layout shows (< 1024px)
- [ ] Web animations play smoothly

### iOS Features

- [ ] Pull-to-refresh reloads page
- [ ] Back/forward gestures work
- [ ] External links open in Safari (if enabled)
- [ ] Settings persist across launches
- [ ] Clear cache removes all data
- [ ] App survives background/foreground

### Edge Cases

- [ ] No network: Shows offline state
- [ ] Slow network: Progress bar shows accurately
- [ ] Backend down: Displays error gracefully
- [ ] Rapid tab switching: No crashes
- [ ] Memory warnings: App doesn't crash

---

## Troubleshooting

### "Next.js server not running"

**Symptom:** White screen or "Cannot connect to server"

**Solution:**
```bash
# Check if server is running
lsof -i :4000

# If not, start it
cd ~/Documents/Pare
npm run dev

# Verify in browser
open http://localhost:4000/compare
```

### "localhost:4000 not reachable from Simulator"

**Symptom:** Connection refused or timeout

**Cause:** ATS (App Transport Security) misconfigured

**Solution 1 - Check Info.plist:**
```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

**Solution 2 - Use 127.0.0.1:**
In `Config.swift`, change:
```swift
static let devBaseURL = "http://127.0.0.1:4000"
```

**Solution 3 - Physical Device:**
```swift
// Use Mac's local network IP
static let devBaseURL = "http://192.168.1.XXX:4000"
```

Find Mac IP:
```bash
ipconfig getifaddr en0
```

### "XcodeGen command not found"

**Symptom:** `./Scripts/gen_xcode.sh` fails

**Solution:**
```bash
# Install XcodeGen
brew install xcodegen

# Verify installation
xcodegen --version

# Retry script
./Scripts/gen_xcode.sh
```

### "Build failed: Missing Info.plist"

**Symptom:** Xcode can't find Info.plist

**Cause:** Project not generated correctly

**Solution:**
```bash
cd ios
rm -rf Pare.xcodeproj
./Scripts/gen_xcode.sh
```

### "No such module 'WebKit'"

**Symptom:** Compile error in WebView files

**Cause:** Missing framework link

**Solution:**
1. Select project in Xcode
2. Select Pare target
3. Go to **Build Phases** → **Link Binary With Libraries**
4. Click **+**
5. Add `WebKit.framework`
6. Clean build folder (`⌘⇧K`)
7. Rebuild (`⌘B`)

### "App crashes on launch"

**Symptom:** Immediate crash after splash screen

**Debug Steps:**
1. Check Xcode console for error
2. Look for red crash logs
3. Common causes:
   - Missing app icon (non-critical)
   - Invalid Info.plist
   - Swift runtime error

**Solution:**
```bash
# Clean build
cd ios
rm -rf build DerivedData
xcodebuild clean
open Pare.xcodeproj

# In Xcode: Product → Clean Build Folder (⌘⇧K)
# Rebuild (⌘B)
```

### "Service worker causes stale content"

**Symptom:** Old version of web app shows

**Solution 1 - Clear Cache (iOS):**
1. Go to Settings tab
2. Tap "Clear Web Cache"
3. Confirm deletion

**Solution 2 - Clear Cache (Xcode):**
1. Stop app
2. Delete app from Simulator
3. Simulator → Device → Erase All Content and Settings
4. Rebuild and run

**Solution 3 - Disable Service Worker:**
In `public/sw.js`, add at top:
```javascript
// Detect iOS shell
const isIOSShell = /Pare-iOS/.test(navigator.userAgent);
if (isIOSShell) {
  self.skipWaiting();
  self.clients.claim();
  // Don't register service worker
  return;
}
```

### "Pull-to-refresh doesn't work"

**Symptom:** Pulling down does nothing

**Cause 1:** Disabled in Settings

**Solution:** Settings tab → Enable "Pull to Refresh"

**Cause 2:** Web content scroll conflict

**Solution:** This is expected behavior - pull-to-refresh only works when scroll is at top.

### "Can't open external links"

**Symptom:** Links don't open in Safari

**Cause:** `openLinksExternally` disabled

**Solution:** Settings tab → Enable "Open Links Externally"

### "WebView is blank but console shows no errors"

**Symptom:** White screen, no errors

**Debug Steps:**
1. Debug tab → Check current URL
2. Debug tab → Tap "Reload"
3. Check user agent string
4. Print debug info

**Solution:**
```bash
# Test backend directly
curl http://localhost:4000/compare

# Check for CORS issues
curl -I http://localhost:4000/compare

# Look for 404s in Next.js console
```

---

## Console Output Guide

### Successful Launch

```
📱 Pare Configuration
   App Name: Pare
   Version: 1.0.0 (1)
   Bundle ID: com.OptimusCashLLC.pare
   Build: Debug
   Base URL: http://localhost:4000
   Pull-to-Refresh: true
   External Links: true

🌐 [WebViewModel] Initialized with URL: http://localhost:4000/compare

🌐 [WebViewContainer] Created WebView with URL: http://localhost:4000/compare

🌉 [PareBridge] Received message from web: {action: "log", data: "Pare iOS Bridge initialized"}

🌐 [Navigation] Started loading

🌐 [Navigation] Finished loading: http://localhost:4000/compare
```

### Error: Backend Not Running

```
❌ [Navigation] Failed: Could not connect to the server.

The operation couldn't be completed. (NSURLErrorDomain error -1004.)
```

**Solution:** Start Next.js dev server (`npm run dev`)

### Error: Invalid URL

```
🌐 [WebViewModel] Initialized with URL: http://localhost:4000/compare

❌ [Navigation] Failed: unsupported URL

The operation couldn't be completed. (WebKitErrorDomain error 101.)
```

**Solution:** Check `Config.swift` for typos in base URL

---

## Build Configurations

### Debug (Development)

**Purpose:** Local development with Next.js dev server

**Base URL:** `http://localhost:4000`

**ATS:** Allows HTTP to localhost

**Optimizations:** None (`-Onone`)

**Logging:** Enabled

**Use When:**
- Developing features
- Testing with hot reload
- Debugging issues

### Release (Production)

**Purpose:** TestFlight, App Store, production testing

**Base URL:** `https://pare-nfl.app` (⚠️ TODO: Update with real prod URL)

**ATS:** HTTPS only

**Optimizations:** Full (`-O`, whole module)

**Logging:** Disabled

**Use When:**
- Building for TestFlight
- Archiving for App Store
- Performance testing

**Switch Schemes:**
1. Scheme dropdown (top left)
2. Select Pare-Release
3. Product → Clean Build Folder
4. Build and run

---

## Performance Tips

### Reduce Build Time

1. **Use Debug scheme** for development (faster compile)
2. **Incremental builds**: Don't clean unless necessary
3. **Close other Xcode projects**: Reduces memory pressure
4. **Upgrade Mac RAM**: Xcode loves RAM (16GB+ recommended)

### Improve Runtime Performance

1. **Use Release scheme** for performance testing
2. **Profile with Instruments**: Xcode → Product → Profile
3. **Monitor memory**: Debug navigator → Memory tab
4. **Test on device**: Simulator is slower than real hardware

### Reduce App Size

1. **Release builds** have smaller binary (~5-10MB)
2. **Asset compression**: Use PNG8 when possible
3. **Remove unused code**: Swift dead code elimination

---

## Advanced Topics

### JavaScript Bridge Usage

**iOS → Web:**
```swift
// In any view with access to webView
webView.evaluateJavaScript("window.updateTeam('Vikings')") { result, error in
    if let error = error {
        print("JS error: \(error)")
    }
}
```

**Web → iOS:**
```javascript
// In web app
window.PareBridge.postMessage('shareTeam', {
    team: 'Minnesota Vikings',
    stats: {...}
});
```

**Handle in PareBridge.swift:**
```swift
case "shareTeam":
    if let teamData = data as? [String: Any] {
        // Show native share sheet
        shareTeam(teamData)
    }
```

### Custom URL Schemes

**Add to Info.plist:**
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>pare</string>
        </array>
    </dict>
</array>
```

**Handle in PareApp.swift:**
```swift
.onOpenURL { url in
    // pare://compare?team=Vikings
    handleDeepLink(url)
}
```

### Push Notifications

**Prerequisites:**
1. Add Push Notifications capability
2. Register for remote notifications
3. Configure backend to send pushes

**Not implemented yet** - requires backend support.

---

## Common Development Tasks

### Add New Swift File

```bash
# 1. Create file
cd ios/Pare
mkdir -p UI/Components
touch UI/Components/TeamLogoView.swift

# 2. Write Swift code
cat > UI/Components/TeamLogoView.swift << 'EOF'
import SwiftUI

struct TeamLogoView: View {
    let teamName: String
    
    var body: some View {
        // Component code
    }
}
EOF

# 3. Regenerate project
cd ..
./Scripts/gen_xcode.sh

# 4. Open Xcode and build
open Pare.xcodeproj
```

### Update App Icon

```bash
# Option 1: Convert existing web icon
cd ios/Pare/Resources/Assets.xcassets/AppIcon.appiconset/
magick ~/Documents/Pare/public/icon-192.png -resize 1024x1024 AppIcon-1024.png

# Option 2: Use custom icon
cp /path/to/your/icon-1024.png AppIcon-1024.png

# Verify
ls -lh AppIcon-1024.png
# Should show 1024x1024 PNG
```

### Change App Version

```bash
# Edit Debug.xcconfig and Release.xcconfig
# Change these lines:
MARKETING_VERSION = 1.1.0  # User-visible version
CURRENT_PROJECT_VERSION = 2  # Build number

# Regenerate project
./Scripts/gen_xcode.sh
```

### Switch to Production URL

**Temporary (Settings Tab):**
1. Open app
2. Go to Settings tab
3. Change Environment from "Development" to "Production"

**Permanent (Code):**
```swift
// In Config.swift
static let prodBaseURL = "https://your-prod-domain.com"
```

---

## Testing on Physical Device

### Requirements

1. **Apple ID** with Developer Program ($99/year) OR free developer account
2. **USB cable** to connect iPhone/iPad
3. **Device running iOS 16.0+**

### Setup

1. **Connect device** via USB
2. **Trust computer** on device when prompted
3. **Open Xcode**
4. **Select device** from destination dropdown
5. **Sign app**:
   - Select project → Pare target
   - Signing & Capabilities
   - Team: Select your Apple ID
   - Bundle ID: Must be unique (change if needed)
6. **Build and run** (`⌘R`)

### Using Mac's Local Network

**Problem:** Device can't reach `localhost:4000`

**Solution:**
```bash
# Find Mac's IP
ipconfig getifaddr en0
# Example: 192.168.1.42
```

**Option 1 - Temporary (App):**
1. Settings tab
2. Manually navigate to `http://192.168.1.42:4000`

**Option 2 - Code:**
```swift
// In Config.swift
#if DEBUG
static let devBaseURL = "http://192.168.1.42:4000"
#endif
```

**Ensure Next.js binds to 0.0.0.0:**
```json
// package.json
"dev": "next dev --turbopack -p 4000 -H 0.0.0.0"
```

---

## Maintenance

### Update Dependencies

**Xcode:**
- App Store → Updates tab

**XcodeGen:**
```bash
brew upgrade xcodegen
```

**Next.js (affects web integration):**
```bash
cd ~/Documents/Pare
npm outdated
npm update
```

### Clean Up Old Backups

**Remove old iOS attempts:**
```bash
cd ~/Documents/Pare
rm -rf ios-backup ios-backup-2 "ios-backup 3"
```

**Verify:**
```bash
git status
# Ensure ios-backup* folders are listed
```

**Commit:**
```bash
git rm -rf ios-backup*
git commit -m "chore(ios): remove old iOS backup folders"
```

---

## Resources

### Documentation

- **Local:**
  - `docs/mobile/AUDIT_iOS_FOUNDATION.md` - Foundation audit
  - `docs/mobile/IOS_WRAPPER_PLAN.md` - Architecture plan
  - `docs/mobile/IOS_RUNBOOK.md` - This file

- **Apple:**
  - [WKWebView Docs](https://developer.apple.com/documentation/webkit/wkwebview)
  - [SwiftUI Docs](https://developer.apple.com/documentation/swiftui/)
  - [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)

- **XcodeGen:**
  - [GitHub](https://github.com/yonaskolb/XcodeGen)
  - [Project Spec](https://github.com/yonaskolb/XcodeGen/blob/master/Docs/ProjectSpec.md)

### Support

- **Issues:** Check `docs/mobile/` for troubleshooting guides
- **Questions:** Refer to inline code comments (all Swift files documented)
- **Updates:** Follow CHANGELOG.md for iOS changes

---

## Next Steps

### Phase 1 (Immediate)

- [ ] Run `./Scripts/setup.sh`
- [ ] Generate app icon (1024x1024)
- [ ] Build and run on Simulator
- [ ] Test all 3 tabs
- [ ] Verify web integration

### Phase 2 (Short Term)

- [ ] Test on physical device
- [ ] Configure production URL
- [ ] Test Release build
- [ ] Profile performance
- [ ] Submit TestFlight build

### Phase 3 (Future Enhancements)

- [ ] Universal links (deep linking)
- [ ] Push notifications
- [ ] Native share sheet integration
- [ ] iPad optimization
- [ ] Widgets

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-14  
**Maintained By**: iOS Development Team  
**Status**: Production Ready ✅


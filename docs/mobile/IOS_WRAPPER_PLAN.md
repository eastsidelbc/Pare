# iOS Wrapper Plan for Pare NFL Comparison

**Date**: 2025-10-14  
**Project**: Pare NFL Team Comparison  
**Architect**: iOS + Web Senior Architect  
**Status**: ✅ PHASE B COMPLETE - READY FOR IMPLEMENTATION

---

## Executive Summary

**Approach**: SwiftUI app with WKWebView container, native bottom tabs, and XcodeGen for deterministic project generation.

**Target**: iOS 16.0+  
**Bundle ID**: `com.OptimusCashLLC.pare`  
**Display Name**: Pare

**Key Features**:
- ✅ WKWebView loads web app at `localhost:4000` (Debug) or production URL (Release)
- ✅ Native bottom tab bar (3 tabs: Home, Settings, Debug)
- ✅ Pull-to-refresh, progress indicator, back/forward gestures
- ✅ External links open in SFSafariViewController
- ✅ File upload support (photo library picker)
- ✅ Optional JS bridge (`window.PareBridge`) for iOS ↔ Web communication
- ✅ XcodeGen for reproducible project generation

---

## 1. Architecture

### 1.1 Overview

```
┌─────────────────────────────────────┐
│       PareApp (SwiftUI)             │
│   ┌───────────────────────────┐     │
│   │   PareTabView (TabView)   │     │
│   │ ┌───────┬─────────┬─────┐ │     │
│   │ │ Home  │Settings │Debug│ │     │
│   │ └───┬───┴─────────┴─────┘ │     │
│   │     │                      │     │
│   │ ┌───▼──────────────────┐  │     │
│   │ │  WebViewContainer    │  │     │
│   │ │  ┌─────────────────┐ │  │     │
│   │ │  │   WKWebView     │ │  │     │
│   │ │  │                 │ │  │     │
│   │ │  │ localhost:4000  │ │  │     │
│   │ │  │ (or prod URL)   │ │  │     │
│   │ │  └─────────────────┘ │  │     │
│   │ │  ProgressBar        │  │     │
│   │ │  Pull-to-Refresh    │  │     │
│   │ └─────────────────────┘  │     │
│   └─────────────────────────┘     │
└─────────────────────────────────────┘
```

### 1.2 SwiftUI App Shell

**Entry Point**: `PareApp.swift`

```swift
@main
struct PareApp: App {
    @StateObject private var coordinator = AppCoordinator()
    
    var body: some Scene {
        WindowGroup {
            PareTabView()
                .environmentObject(coordinator)
        }
    }
}
```

### 1.3 Bottom Tab Bar (3 Tabs)

**Tab 1: Home** (WKWebView)
- Loads web app at configured base URL
- Shows loading progress bar
- Pull-to-refresh support
- Back/forward navigation gestures
- External link handling

**Tab 2: Settings** (Native SwiftUI)
- Environment switcher (Dev / Prod)
- Clear web cache button
- Pull-to-refresh toggle
- Open links externally toggle
- "Open in Safari" button
- App version info

**Tab 3: Debug** (Native SwiftUI)
- Current URL display
- User agent display
- Back/Forward navigation buttons
- Reload button
- Clear cookies button
- "Reset WebView state" action
- Console log viewer (via JS bridge)

### 1.4 WKWebView Container

**Component**: `WebViewContainer.swift`

**Features**:
1. **Progress Indicator**: KVO on `estimatedProgress`
2. **Pull-to-Refresh**: `UIRefreshControl` integration
3. **Navigation Gestures**: Back/forward swipe gestures
4. **External Links**: Intercept `target="_blank"` → `SFSafariViewController`
5. **File Uploads**: Photo library picker via `UIImagePickerController`
6. **JS Bridge**: `WKScriptMessageHandler` for `window.PareBridge.postMessage()`

**State Management**: `WebViewModel.swift`

```swift
@MainActor
class WebViewModel: ObservableObject {
    @Published var currentURL: URL
    @Published var canGoBack: Bool = false
    @Published var canGoForward: Bool = false
    @Published var estimatedProgress: Double = 0.0
    @Published var isLoading: Bool = false
    @Published var environment: Environment = .dev
    
    enum Environment {
        case dev    // localhost:4000
        case prod   // https://pare-nfl.app (or whatever prod URL)
    }
    
    var baseURL: String {
        switch environment {
        case .dev:  return "http://localhost:4000"
        case .prod: return Config.prodBaseURL
        }
    }
}
```

### 1.5 JS Bridge (Optional)

**Purpose**: Bidirectional communication between iOS and Web

**iOS → Web**:
```swift
webView.evaluateJavaScript("window.updateTeam('Vikings')")
```

**Web → iOS**:
```swift
// Register handler
webView.configuration.userContentController.add(self, name: "pareBridge")

// Web calls:
window.webkit.messageHandlers.pareBridge.postMessage({
    action: "openSettings",
    data: { ... }
})
```

**Use Cases**:
- Web requests native share sheet
- Web requests native team logo picker
- iOS injects user preferences
- Console log relay for Debug tab

---

## 2. XcodeGen Configuration

### 2.1 Why XcodeGen?

**Benefits**:
- ✅ Deterministic project generation
- ✅ No `.xcodeproj` conflicts in git
- ✅ Easy to add files/targets
- ✅ Clean project structure
- ✅ Team-friendly

**Trade-off**: Requires `xcodegen` CLI installed

### 2.2 Project Structure

```
/ios/
├── project.yml                   # XcodeGen spec
├── Config/
│   ├── Debug.xcconfig            # Debug configuration
│   └── Release.xcconfig          # Release configuration
├── Pare/
│   ├── App/
│   │   ├── PareApp.swift         # @main entry point
│   │   └── AppCoordinator.swift  # App-level state
│   ├── Web/
│   │   ├── WebViewContainer.swift    # WKWebView wrapper
│   │   ├── WebViewModel.swift        # WebView state
│   │   └── PareBridge.swift          # JS bridge
│   ├── UI/
│   │   ├── Tabs/
│   │   │   ├── PareTabView.swift     # Main tab container
│   │   │   ├── HomeTab.swift         # WKWebView tab
│   │   │   ├── SettingsTab.swift     # Settings UI
│   │   │   └── DebugTab.swift        # Debug UI
│   │   └── Common/
│   │       ├── ProgressBar.swift     # Loading progress
│   │       └── RefreshControl.swift  # Pull-to-refresh
│   ├── Models/
│   │   └── Config.swift              # App configuration
│   ├── Resources/
│   │   ├── Info.plist
│   │   └── Assets.xcassets/
│   │       └── AppIcon.appiconset/
│   └── Preview Content/
│       └── PreviewAssets.xcassets/
└── Scripts/
    ├── gen_xcode.sh              # Generate .xcodeproj
    └── setup.sh                  # First-time setup
```

### 2.3 project.yml

```yaml
name: Pare
options:
  bundleIdPrefix: com.OptimusCashLLC
  deploymentTarget:
    iOS: "16.0"
  developmentLanguage: en
  xcodeVersion: "15.0"

configs:
  Debug: debug
  Release: release

configFiles:
  Debug: Config/Debug.xcconfig
  Release: Config/Release.xcconfig

targets:
  Pare:
    type: application
    platform: iOS
    deploymentTarget: "16.0"
    sources:
      - Pare
    resources:
      - Pare/Resources/Assets.xcassets
    info:
      path: Pare/Resources/Info.plist
      properties:
        CFBundleDisplayName: Pare
        CFBundleIdentifier: $(PRODUCT_BUNDLE_IDENTIFIER)
        CFBundleShortVersionString: $(MARKETING_VERSION)
        CFBundleVersion: $(CURRENT_PROJECT_VERSION)
        UILaunchStoryboardName: LaunchScreen
        UISupportedInterfaceOrientations:
          - UIInterfaceOrientationPortrait
          - UIInterfaceOrientationLandscapeLeft
          - UIInterfaceOrientationLandscapeRight
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.OptimusCashLLC.pare
        MARKETING_VERSION: "1.0.0"
        CURRENT_PROJECT_VERSION: "1"
        SWIFT_VERSION: "5.9"
        TARGETED_DEVICE_FAMILY: "1,2"  # iPhone + iPad
        IPHONEOS_DEPLOYMENT_TARGET: "16.0"

schemes:
  Pare-Debug:
    build:
      targets:
        Pare: all
    run:
      config: Debug
    archive:
      config: Debug
      
  Pare-Release:
    build:
      targets:
        Pare: all
    run:
      config: Release
    archive:
      config: Release
```

---

## 3. Configuration via xcconfigs

### 3.1 Debug.xcconfig

```
// Debug Configuration for Pare iOS
// Used for local development with Next.js dev server

// Base URLs
DEV_BASE_URL = http:/$()/localhost:4000
PROD_BASE_URL = https:/$()/pare-nfl.app

// Active Environment
ACTIVE_BASE_URL = $(DEV_BASE_URL)

// Bundle ID
PRODUCT_BUNDLE_IDENTIFIER = com.OptimusCashLLC.pare

// App Version
MARKETING_VERSION = 1.0.0
CURRENT_PROJECT_VERSION = 1

// Code Signing
CODE_SIGN_STYLE = Automatic
DEVELOPMENT_TEAM = 

// Swift
SWIFT_VERSION = 5.9
SWIFT_OPTIMIZATION_LEVEL = -Onone

// Debug Flags
DEBUG_INFORMATION_FORMAT = dwarf-with-dsym
ENABLE_TESTABILITY = YES
GCC_OPTIMIZATION_LEVEL = 0
SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG
```

### 3.2 Release.xcconfig

```
// Release Configuration for Pare iOS
// Used for TestFlight and App Store builds

// Base URLs
DEV_BASE_URL = http:/$()/localhost:4000
PROD_BASE_URL = https:/$()/pare-nfl.app

// Active Environment
ACTIVE_BASE_URL = $(PROD_BASE_URL)

// Bundle ID
PRODUCT_BUNDLE_IDENTIFIER = com.OptimusCashLLC.pare

// App Version
MARKETING_VERSION = 1.0.0
CURRENT_PROJECT_VERSION = 1

// Code Signing
CODE_SIGN_STYLE = Automatic
DEVELOPMENT_TEAM = 

// Swift
SWIFT_VERSION = 5.9
SWIFT_OPTIMIZATION_LEVEL = -O

// Release Flags
DEBUG_INFORMATION_FORMAT = dwarf-with-dsym
ENABLE_TESTABILITY = NO
GCC_OPTIMIZATION_LEVEL = s
SWIFT_COMPILATION_MODE = wholemodule
```

**Note**: `$/()` syntax prevents `//` from being treated as comment

---

## 4. ATS & Privacy

### 4.1 App Transport Security

**Info.plist Configuration**:

```xml
<!-- Debug builds only -->
#if DEBUG
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
  <key>NSAllowsArbitraryLoadsInWebContent</key>
  <true/>
</dict>
#endif

<!-- Release builds: HTTPS only -->
```

**Implementation Strategy**:

1. **Debug**:
   - Allow `http://localhost:4000`
   - Allow arbitrary loads in web content (for dev)

2. **Release**:
   - Require HTTPS for all connections
   - Add production domain to allowlist when available

### 4.2 Privacy Strings

**Required if web app needs photo uploads**:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Pare needs access to your photos to upload team images and logos.</string>

<key>NSCameraUsageDescription</key>
<string>Pare needs camera access to take photos for team comparisons.</string>
```

**Status**: NOT NEEDED YET
- Web app has no file uploads detected
- Omit for now; add when needed

---

## 5. PWA/Cache Interop Strategy

### 5.1 Service Worker Behavior

**Current**: Service worker is iOS-friendly as-is
- ✅ HTML NOT precached
- ✅ CSS is network-first
- ✅ API is stale-while-revalidate

**Recommendation**: Let service worker run normally

### 5.2 Optional: Detect iOS Shell

**If needed**, web can detect iOS wrapper:

**Method 1: User Agent**

```javascript
// In web app
const isIOSShell = /Pare-iOS/.test(navigator.userAgent);
if (isIOSShell) {
  // Disable PWA install prompt
  // Adjust caching strategy
}
```

**Method 2: Query Parameter**

```swift
// In WebViewModel.swift
let url = URL(string: "\(baseURL)?ios_shell=1")
```

```javascript
// In web app
const urlParams = new URLSearchParams(window.location.search);
const isIOSShell = urlParams.get('ios_shell') === '1';
```

**Method 3: Injected JavaScript**

```swift
// In WebViewContainer.swift
let script = WKUserScript(
    source: "window.isIOSShell = true;",
    injectionTime: .atDocumentStart,
    forMainFrameOnly: true
)
webView.configuration.userContentController.addUserScript(script)
```

**Recommendation**: Start with Method 3 (cleanest, no URL pollution)

### 5.3 HTML Precache

**Status**: Already disabled in service worker ✅

No changes needed for iOS.

---

## 6. Implementation Plan

### 6.1 Phase C: Scaffold (If PROCEED_WITH_IOS_SCAFFOLD = true)

**Prerequisites**:
1. Install XcodeGen: `brew install xcodegen`
2. Ensure Next.js dev server runs on port 4000: ✅ Already configured

**Steps**:

**C1. Create /ios with XcodeGen**
1. Create `project.yml` (per spec above)
2. Create `Config/Debug.xcconfig` and `Config/Release.xcconfig`
3. Create `Info.plist` with ATS exceptions
4. Generate placeholder AppIcon (1024x1024)

**C2. SwiftUI Shell & WKWebView**
1. `PareApp.swift` - Main app entry
2. `AppCoordinator.swift` - App state
3. `PareTabView.swift` - Bottom tabs
4. `WebViewContainer.swift` - WKWebView wrapper
5. `WebViewModel.swift` - WebView state management
6. `PareBridge.swift` - JS bridge skeleton
7. `SettingsTab.swift` - Settings UI
8. `DebugTab.swift` - Debug UI
9. `ProgressBar.swift` - Progress indicator
10. `RefreshControl.swift` - Pull-to-refresh

**C3. Assets & Scripts**
1. Convert `public/icon-192.png` to 1024x1024
2. Add to `Assets.xcassets/AppIcon.appiconset/`
3. Create `Scripts/gen_xcode.sh`:
   ```bash
   #!/bin/bash
   cd "$(dirname "$0")/.."
   xcodegen generate
   echo "✅ Xcode project generated at ios/Pare.xcodeproj"
   ```
4. Make executable: `chmod +x Scripts/gen_xcode.sh`

**C4. Update .gitignore**
```
# iOS
ios/*.xcodeproj
ios/Pare.xcworkspace
ios/*.xcuserstate
```

**C5. Verify**
1. Run `cd ios && ./Scripts/gen_xcode.sh`
2. Open `ios/Pare.xcodeproj`
3. Select Pare-Debug scheme
4. Start Next.js: `npm run dev` (in root)
5. Run on iPhone Simulator
6. Verify web app loads at `localhost:4000`

### 6.2 Expected Behavior

**On Launch**:
1. App opens to Home tab
2. Progress bar animates while loading
3. Web app appears at `localhost:4000/compare`
4. Bottom tabs show: Home (active), Settings, Debug

**Pull to Refresh**:
1. Pull down on Home tab
2. Refresh animation
3. Web app reloads

**Settings Tab**:
1. Switch between Dev/Prod environments
2. Clear web cache
3. Toggle pull-to-refresh
4. Open current page in Safari

**Debug Tab**:
1. Shows current URL
2. Shows user agent
3. Back/Forward/Reload buttons
4. Reset WebView state
5. (Future) Console logs from JS bridge

---

## 7. File Layout (Planned)

```
/ios/
├── project.yml                           # XcodeGen spec
├── Config/
│   ├── Debug.xcconfig                    # Debug config
│   └── Release.xcconfig                  # Release config
├── Pare/
│   ├── App/
│   │   ├── PareApp.swift                 # @main
│   │   └── AppCoordinator.swift          # App state
│   ├── Web/
│   │   ├── WebViewContainer.swift        # WKWebView + UIRefreshControl
│   │   ├── WebViewModel.swift            # WebView state (URLs, progress)
│   │   └── PareBridge.swift              # JS bridge (WKScriptMessageHandler)
│   ├── UI/
│   │   ├── Tabs/
│   │   │   ├── PareTabView.swift         # TabView container
│   │   │   ├── HomeTab.swift             # WebView tab
│   │   │   ├── SettingsTab.swift         # Settings UI
│   │   │   └── DebugTab.swift            # Debug tools
│   │   └── Common/
│   │       ├── ProgressBar.swift         # Horizontal progress
│   │       └── RefreshControl.swift      # Pull-to-refresh wrapper
│   ├── Models/
│   │   └── Config.swift                  # Read from xcconfig
│   ├── Resources/
│   │   ├── Info.plist                    # ATS, privacy strings
│   │   └── Assets.xcassets/
│   │       ├── AppIcon.appiconset/       # App icon (1024x1024)
│   │       └── AccentColor.colorset/     # Pare purple
│   └── Preview Content/
│       └── PreviewAssets.xcassets/
└── Scripts/
    ├── gen_xcode.sh                      # Run xcodegen
    └── setup.sh                          # First-time setup
```

**Total Files**: ~20 Swift files, 2 xcconfigs, 1 Info.plist, 1 project.yml

---

## 8. Testing Checklist

**Before proceeding to Phase C**, verify:

- [x] Audit complete (Phase A) ✅
- [x] Plan documented (Phase B) ✅
- [ ] `xcodegen` installed
- [ ] Next.js runs on port 4000 ✅
- [ ] 1024x1024 app icon ready

**After Phase C scaffolding**:

- [ ] Xcode project generates without errors
- [ ] App builds for iPhone Simulator
- [ ] App launches and shows loading progress
- [ ] Web app loads at `localhost:4000`
- [ ] Bottom tabs navigate correctly
- [ ] Pull-to-refresh reloads web app
- [ ] Settings can clear cache
- [ ] Debug tab shows correct URL
- [ ] External links open in Safari (when tested)

---

## 9. Future Enhancements (Post-Launch)

**Phase 1**:
- [ ] Universal links (deep linking)
- [ ] Native share sheet integration
- [ ] Push notifications (if backend supports)

**Phase 2**:
- [ ] Offline banner coordination with native network detection
- [ ] JS bridge for richer iOS ↔ Web communication
- [ ] Native team logo picker

**Phase 3**:
- [ ] iPad optimization (split view)
- [ ] Widgets (team comparison widget)
- [ ] Shortcuts integration

---

## 10. Decision Points

### 10.1 Bottom Tabs: Native vs Web

**Option A: Native SwiftUI TabView** (recommended)
- ✅ Native iOS feel
- ✅ Settings and Debug are truly native
- ✅ Can add iOS-specific features easily
- ❌ Web bottom bar shows redundantly (can hide with CSS/JS)

**Option B: Web-Only Tabs**
- ✅ Single source of truth
- ✅ No duplicate navigation
- ❌ Can't add native-only tabs (Settings, Debug)
- ❌ Less iOS-native feel

**Decision**: **Option A** (Native TabView)
- Hide web bottom bar when `isIOSShell === true`

### 10.2 XcodeGen: Generate on Demand vs Commit

**Option A: Generate on Demand** (recommended)
- ✅ No `.xcodeproj` in git
- ✅ No merge conflicts
- ✅ Clean git history
- ❌ Requires `xcodegen` installed
- ❌ Extra step for contributors

**Option B: Commit `.xcodeproj`**
- ✅ Works immediately after clone
- ✅ No extra tools needed
- ❌ Merge conflicts in `.pbxproj`
- ❌ Messy git diffs

**Decision**: **Option A** (Generate on demand)
- Add setup instructions to README
- Provide `Scripts/setup.sh` for first-time setup

### 10.3 Service Worker: Keep or Disable in iOS

**Option A: Keep Running** (recommended)
- ✅ Offline capability
- ✅ Faster subsequent loads
- ✅ No changes needed
- ❌ Extra complexity

**Option B: Disable in iOS**
- ✅ Simpler mental model
- ✅ Native caching instead
- ❌ Loses offline capability
- ❌ Requires code changes

**Decision**: **Option A** (Keep running)
- Current service worker is iOS-friendly
- No HTML precaching issues
- Test thoroughly; disable if problems arise

---

## 11. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Service worker causes stale content | Medium | Low | Already network-first for HTML |
| WKWebView doesn't support Web APIs | High | Low | Test all features; most work in iOS 16+ |
| ATS blocks localhost in Debug | High | Medium | Proper Info.plist configuration |
| App Store rejection (wrapper policy) | Critical | Low | App provides native features (tabs, settings) |
| Performance slower than Safari | Medium | Low | WKWebView is same engine as Safari |
| Pull-to-refresh conflicts with web | Low | Low | Disable when web has scrolled content |

---

## 12. Conclusion

**Status**: ✅ **PLAN COMPLETE - READY FOR IMPLEMENTATION**

This plan provides a comprehensive roadmap for wrapping the Pare web app in a native iOS shell. The approach balances native iOS feel (SwiftUI tabs, gestures) with web app flexibility (same codebase for web and iOS).

**Key Decisions**:
- ✅ SwiftUI + WKWebView architecture
- ✅ XcodeGen for reproducible project generation
- ✅ Native bottom tabs (Home, Settings, Debug)
- ✅ Debug/Release schemes with different base URLs
- ✅ ATS configured for localhost (Debug) and HTTPS (Release)
- ✅ Service worker runs as-is (no changes needed)
- ✅ Optional JS bridge for future enhancements

**Next Step**: Set `PROCEED_WITH_IOS_SCAFFOLD = true` and proceed to Phase C.

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-14  
**Review Status**: Ready for Implementation ✅


# Xcode Project Configuration

**Date**: 2025-10-10  
**Purpose**: Configure Xcode project for iOS development (Port 4000)  
**Status**: ✅ COMPLETE  
**Links**:
- Setup Guide: `Pare-iOS/XCODE_SETUP_GUIDE.md`
- API Docs: `MOBILE_NOTES.md`
- CLAUDE.md: `CLAUDE.md#ios-swift-development-guidelines`

---

## Summary

Configured Xcode project with all necessary files for iOS development on port 4000.

**What was delivered**:
1. ✅ `Config.xcconfig` - App configuration (API URL, version, feature flags)
2. ✅ `Info.plist` - Complete with ATS, dark mode, bundle ID
3. ✅ `XCODE_SETUP_GUIDE.md` - Step-by-step instructions for beginners
4. ✅ Port 4000 migration - Backend + docs + iOS aligned
5. ✅ Updated all documentation to use port 4000

---

## Files Created

### 1. Pare-iOS/Config.xcconfig

**Purpose**: Like `.env` for iOS - stores configuration variables

**Key Settings**:
```
API_BASE_URL = http:/$()/localhost:4000
APP_VERSION = 1.0.0
BUILD_NUMBER = 1
ENABLE_DEBUG_LOGGING = YES
PRODUCT_BUNDLE_IDENTIFIER = com.OptimusCashLLC.pare
IPHONEOS_DEPLOYMENT_TARGET = 16.0
```

**React Equivalent**: `.env` file with `NEXT_PUBLIC_*` variables

### 2. Pare-iOS/Info.plist

**Purpose**: Like `manifest.json` + permissions

**Key Settings**:
- ✅ **Dark mode forced**: `UIUserInterfaceStyle = Dark`
- ✅ **Localhost HTTP allowed**: `NSAllowsLocalNetworking = true`
- ✅ **Display name**: "Pare"
- ✅ **Bundle ID**: `com.OptimusCashLLC.pare`
- ✅ **Version from config**: Uses `$(APP_VERSION)` and `$(BUILD_NUMBER)`

**React Equivalent**: `manifest.json` + CORS + environment config

### 3. Pare-iOS/XCODE_SETUP_GUIDE.md

**Purpose**: Beginner-friendly Xcode setup instructions

**Contents**:
- Step-by-step guide for adding files to Xcode
- How to configure Bundle Identifier
- How to set Deployment Target (iOS 16.0)
- App Icon setup instructions
- Configuration verification tests
- React → Swift comparison cheat sheet
- Common issues & fixes

**Audience**: React developers new to Xcode/iOS

---

## Port 4000 Migration

### Files Updated

1. **package.json**:
   ```json
   "dev": "next dev --turbopack -p 4000"
   "start": "next start -p 4000"
   ```

2. **config/constants.ts**:
   ```typescript
   API: {
     // ...
     PORT: 4000, // iOS development port
   }
   ```

3. **MOBILE_NOTES.md**:
   - All `localhost:3000` → `localhost:4000`
   - All Swift examples updated
   - All curl examples updated

### Why Port 4000?

**User's iOS app** (`ContentView.swift`) already hardcoded to port 4000:
```swift
private let startURL = URL(string: "http://127.0.0.1:4000/compare")!
```

**Benefit**: Consistency across:
- ✅ Next.js backend (port 4000)
- ✅ API documentation (port 4000)
- ✅ iOS app (port 4000)

---

## Configuration Explained (for React Developers)

### 1. Config.xcconfig vs .env

| Feature | .env | Config.xcconfig |
|---------|------|-----------------|
| **Purpose** | Store config | Store config |
| **Access** | `process.env.*` | `Bundle.main.object(forInfoDictionaryKey:)` |
| **Committed** | ❌ No (.gitignore) | ✅ Yes (not secrets) |
| **Build-time** | ❌ No | ✅ Yes (compile-time) |
| **Runtime** | ✅ Yes | Via Info.plist only |

### 2. Info.plist vs manifest.json

| Feature | manifest.json | Info.plist |
|---------|---------------|-----------|
| **App name** | `name` | `CFBundleDisplayName` |
| **Version** | `version` | `CFBundleShortVersionString` |
| **Icons** | `icons[]` | AppIcon.appiconset |
| **Permissions** | ❌ N/A | Various `NS*` keys |
| **Dark mode** | CSS | `UIUserInterfaceStyle` |

### 3. NSAllowsLocalNetworking vs CORS

| Feature | CORS (Web) | ATS (iOS) |
|---------|------------|-----------|
| **Purpose** | Allow cross-origin requests | Allow HTTP (not HTTPS) |
| **Default** | Same-origin only | HTTPS only |
| **Localhost** | Usually allowed | Needs explicit permission |
| **Production** | Configure server | Must use HTTPS |
| **Config** | Server-side headers | Client-side Info.plist |

**Key Difference**: 
- **Web**: Server decides who can access (CORS headers)
- **iOS**: App decides what it can access (ATS exceptions)

---

## Next Steps for User

### Step 1: Add Files to Xcode (5 minutes)

Open `Pare-iOS/XCODE_SETUP_GUIDE.md` and follow:
- ✅ **Step 1**: Add `Config.xcconfig` to Xcode project
- ✅ **Step 2**: Replace/update `Info.plist`
- ✅ **Step 3**: Set Bundle Identifier
- ✅ **Step 4**: Set Deployment Target (iOS 16.0)
- ⭕ **Step 5**: App Icon (optional for now)
- ✅ **Step 6**: Verify configuration

### Step 2: Test Backend on Port 4000 (1 minute)

```bash
# Start Next.js on port 4000
npm run dev

# Test health endpoint
curl http://localhost:4000/api/health | jq

# Expected:
# {
#   "ok": true,
#   "version": "1.0.0",
#   ...
# }
```

### Step 3: Test iOS App (1 minute)

1. **Make sure backend running**: `npm run dev` (port 4000)
2. **Run iOS app in Xcode**: `Cmd+R`
3. **Check Simulator**: Should show Vikings vs Lions (from screenshot)
4. **Verify no errors**: Check Xcode console (bottom panel)

### Step 4: Ready for Next Prompt

Once configuration verified:
- ✅ Backend running on port 4000
- ✅ iOS app connecting successfully
- ✅ No ATS errors in console

**Then proceed to**: Prompt #3 - Creating Swift API Client (`StatsAPI.swift`)

---

## Configuration Verification Checklist

### Backend (Next.js)

- [ ] `npm run dev` starts on port 4000
- [ ] `curl http://localhost:4000/api/health | jq` returns success
- [ ] `curl http://localhost:4000/api/nfl-2025/offense | jq '.rows[0]'` returns data
- [ ] No console errors

### Xcode Project

- [ ] `Config.xcconfig` added to project
- [ ] `Config.xcconfig` linked to Debug/Release configurations
- [ ] `Info.plist` contains `NSAllowsLocalNetworking = true`
- [ ] `Info.plist` contains `UIUserInterfaceStyle = Dark`
- [ ] Bundle Identifier set to `com.OptimusCashLLC.pare`
- [ ] Deployment Target set to iOS 16.0
- [ ] Project builds without errors (`Cmd+B`)

### iOS App Runtime

- [ ] App runs in Simulator (`Cmd+R`)
- [ ] No ATS errors in console
- [ ] App stays dark (forced dark mode working)
- [ ] Web view loads (shows comparison UI)
- [ ] Backend API accessible from iOS

---

## Common Issues (Beginner-Friendly)

### Issue 1: "Cannot connect to localhost"

**Error in console**:
```
NSURLErrorDomain Code=-1004
"Could not connect to the server"
```

**Cause**: Backend not running or wrong port

**Fix**:
```bash
# Check if backend is running on port 4000
lsof -i :4000

# If not running:
npm run dev

# Verify it's working:
curl http://localhost:4000/api/health
```

### Issue 2: "App Transport Security has blocked..."

**Error in console**:
```
NSURLErrorDomain Code=-1022
"The resource could not be loaded because the App Transport Security policy..."
```

**Cause**: `Info.plist` missing `NSAllowsLocalNetworking`

**Fix**:
1. Open `Info.plist` in Xcode
2. Right-click → "Open As" → "Source Code"
3. Verify this section exists:
   ```xml
   <key>NSAppTransportSecurity</key>
   <dict>
     <key>NSAllowsLocalNetworking</key>
     <true/>
   </dict>
   ```

### Issue 3: "Config variables not loading"

**Symptom**: `Bundle.main.object(forInfoDictionaryKey: "APIBaseURL")` returns `nil`

**Cause**: `Config.xcconfig` not linked to project

**Fix**:
1. Click "Pare-iOS" (blue icon) in Xcode sidebar
2. Click "Info" tab
3. Under "Configurations":
   - Debug: Select "Config"
   - Release: Select "Config"

### Issue 4: "App shows white background"

**Cause**: Dark mode not forced

**Fix**:
1. Verify `Info.plist` has `UIUserInterfaceStyle = Dark`
2. Clean build: `Cmd+Shift+K`
3. Rebuild: `Cmd+B`
4. Run: `Cmd+R`

### Issue 5: "Bundle identifier in use"

**Error**: "An App ID with Identifier 'com.OptimusCashLLC.pare' is not available"

**Cause**: Bundle ID registered to different Apple Developer account

**Fix**: Change to unique Bundle ID:
```
com.yourname.pare
com.test.pare
com.dev.parenfl
```

---

## Technical Details

### Port 4000 Specifics

**Why not 3000?**
- User's iOS app already used 4000 in ContentView.swift
- Avoiding conflict with other local dev servers

**Configuration**:
- **Next.js**: `-p 4000` flag in package.json scripts
- **iOS**: `API_BASE_URL = http:/$()/localhost:4000` in Config.xcconfig
- **Docs**: All examples updated to port 4000

**Production**:
- Change `API_BASE_URL` to HTTPS URL
- No code changes needed (config-driven)

### ATS (App Transport Security)

**What it is**: Apple's security policy requiring HTTPS

**Default behavior**:
- ✅ HTTPS connections allowed
- ❌ HTTP connections blocked
- ❌ Self-signed certificates blocked

**Exceptions**:
- `NSAllowsLocalNetworking` - Allows HTTP to localhost
- **Only works in Simulator** - Physical devices still need HTTPS

**Production**: Remove exception, use HTTPS

### Dark Mode Enforcement

**Why forced?**: Your web app has no light mode CSS

**Implementation**: `UIUserInterfaceStyle = Dark` in Info.plist

**Effect**:
- System appearance toggle has no effect
- App always uses dark mode
- Status bar uses light content (white icons)

**Alternative**: Support both modes (requires light mode CSS)

---

## React → iOS Comparison

### Environment Config

**React**:
```bash
# .env.local (not committed)
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**iOS**:
```
# Config.xcconfig (committed)
API_BASE_URL = http:/$()/localhost:4000
```

### Accessing Config

**React**:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

**iOS**:
```swift
if let apiUrl = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String {
  // Use apiUrl
}
```

### Dark Mode

**React**:
```html
<body class="dark">
```

**iOS**:
```xml
<key>UIUserInterfaceStyle</key>
<string>Dark</string>
```

---

## Graduation to CLAUDE.md

**Status**: No promotion needed

**Reason**: iOS-specific configuration, not reusable across project

**Existing Rules**: See `CLAUDE.md#ios-swift-development-guidelines`

---

## Files Modified

1. ✅ `package.json` - Port 4000 for dev/start scripts
2. ✅ `config/constants.ts` - Added PORT: 4000
3. ✅ `MOBILE_NOTES.md` - All port 3000 → 4000
4. ✅ `CHANGELOG.md` - Added configuration entries

## Files Created

1. ✅ `Pare-iOS/Config.xcconfig` - App configuration
2. ✅ `Pare-iOS/Info.plist` - Complete Info.plist
3. ✅ `Pare-iOS/XCODE_SETUP_GUIDE.md` - Setup instructions
4. ✅ `docs/devnotes/2025-10-10-xcode-configuration.md` - This file

---

## Status: ✅ COMPLETE

**Backend**: Port 4000 configured ✅  
**Docs**: Updated to port 4000 ✅  
**Xcode Files**: Created ✅  
**Setup Guide**: Written ✅

**Next**: User adds files to Xcode, tests configuration, proceeds to Prompt #3

---

**Links**:
- Setup Guide: `Pare-iOS/XCODE_SETUP_GUIDE.md` (READ THIS FIRST)
- API Docs: `MOBILE_NOTES.md`
- API Audit: `docs/devnotes/2025-10-10-api-audit.md`


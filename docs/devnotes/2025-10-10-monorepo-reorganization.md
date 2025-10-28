# Monorepo Reorganization - iOS Project Structure

**Date**: 2025-10-10  
**Purpose**: Consolidate Next.js + iOS into professional monorepo structure  
**Status**: ✅ COMPLETE

---

## Summary

Successfully reorganized the project from split directories into a clean monorepo structure with iOS app properly nested under `/Documents/Pare/ios/`.

---

## What Was Done

### 1. Moved Xcode Project

**From**: `/Users/owner/Documents/Pare-iOS/Pare-iOS.xcodeproj`  
**To**: `/Users/owner/Documents/Pare/ios/Pare.xcodeproj`

**Actions**:
- Copied entire `.xcodeproj` bundle
- Renamed from `Pare-iOS.xcodeproj` to `Pare.xcodeproj` for consistency
- Preserved all project settings, schemes, and workspace data

### 2. Consolidated iOS Source Files

**Merged files from two locations**:
- `/Users/owner/Documents/Pare-iOS/Pare/` (had PareApp.swift, Info.plist, Assets)
- `/Users/owner/Documents/Pare/ios/Pare/` (had Swift files created in session)

**Result**: All iOS files now in `/Users/owner/Documents/Pare/ios/Pare/`

### 3. Organized Folder Structure

Created proper iOS project structure:

```
ios/
├── Pare.xcodeproj/              ← Xcode project (renamed from Pare-iOS)
│   ├── project.pbxproj
│   └── project.xcworkspace/
├── Pare/                        ← iOS source code
│   ├── Models/
│   │   └── TeamData.swift
│   ├── Services/
│   │   ├── StatsAPI.swift
│   │   └── CacheManager.swift
│   ├── ViewModels/
│   │   └── StatsViewModel.swift
│   ├── Views/
│   │   └── ContentView.swift
│   ├── Assets.xcassets/
│   ├── Config.xcconfig
│   ├── Info.plist
│   └── PareApp.swift
├── SWIFT_FILES_SETUP.md
└── XCODE_SETUP_GUIDE.md
```

### 4. Files Preserved

**Configuration**:
- ✅ Config.xcconfig (at ios/ level)
- ✅ Info.plist (in ios/Pare/)
- ✅ PareApp.swift (app entry point)

**Assets**:
- ✅ Assets.xcassets/ (app icons, colors)

**Documentation**:
- ✅ SWIFT_FILES_SETUP.md
- ✅ XCODE_SETUP_GUIDE.md

**Source Code**:
- ✅ All 5 Swift files (Models, Services, ViewModels, Views)

---

## New Directory Structure

### Complete Monorepo

```
Documents/Pare/                   ← Root monorepo
│
├── app/                          ← Next.js app directory
├── components/                   ← React components
├── lib/                          ← Shared utilities
├── data/                         ← CSV data files
├── public/                       ← Static assets
│
├── ios/                          ← iOS app (NEW LOCATION)
│   ├── Pare.xcodeproj/           ← Xcode project
│   ├── Pare/                     ← iOS source code
│   │   ├── Models/
│   │   ├── Services/
│   │   ├── ViewModels/
│   │   ├── Views/
│   │   ├── Assets.xcassets/
│   │   ├── Config.xcconfig
│   │   ├── Info.plist
│   │   └── PareApp.swift
│   ├── SWIFT_FILES_SETUP.md
│   └── XCODE_SETUP_GUIDE.md
│
├── docs/                         ← Documentation
├── CLAUDE.md                     ← Project rules
├── CHANGELOG.md                  ← Change log
├── MOBILE_NOTES.md               ← iOS API docs
├── SESSION_SUMMARY_2025-10-10.md ← Session context
└── (other Next.js files)
```

---

## Manual Steps Required in Xcode

### ⚠️ IMPORTANT: You Must Update Xcode Project

The `.xcodeproj` file still points to old paths. You need to:

1. **Open the moved project**:
   ```bash
   open /Users/owner/Documents/Pare/ios/Pare.xcodeproj
   ```

2. **You'll see red files** (missing references)

3. **Fix file references**:
   - Click each red file in Project Navigator
   - In File Inspector (right panel), click folder icon under "Location"
   - Navigate to correct location in `ios/Pare/`
   - Select the file

4. **Or rebuild file structure**:
   - Delete all source file references (keep .xcodeproj)
   - Right-click "Pare" folder → "Add Files to Pare..."
   - Select entire `ios/Pare/` folder
   - ✅ Check "Create groups"
   - ✅ Check "Pare" target
   - Add

5. **Verify Config.xcconfig link**:
   - Click "Pare" project (blue icon)
   - Go to "Info" tab
   - Under "Configurations":
     - Debug: Should show "Config" (not "None")
     - Release: Should show "Config" (not "None")
   - If "None", click and select `Config.xcconfig`

6. **Test build**:
   - Clean: `Cmd+Shift+K`
   - Build: `Cmd+B`
   - Should build successfully

---

## Path to Open

**Open this file in Xcode**:
```bash
/Users/owner/Documents/Pare/ios/Pare.xcodeproj
```

**Or use Finder**:
1. Navigate to `Documents/Pare/ios/`
2. Double-click `Pare.xcodeproj`

---

## What Wasn't Touched

**Next.js files** (unchanged):
- ✅ app/
- ✅ components/
- ✅ lib/
- ✅ data/
- ✅ public/
- ✅ All configuration files

**Swift code** (not modified, just moved):
- ✅ All Swift files kept exact content
- ✅ Only moved to new locations

**Documentation** (preserved):
- ✅ CLAUDE.md
- ✅ MOBILE_NOTES.md
- ✅ All setup guides

---

## Cleanup (Optional)

### Old Pare-iOS Directory

**Status**: `/Users/owner/Documents/Pare-iOS/` still exists

**Can be deleted after verification**:
```bash
# ONLY after you've verified the new project works!
rm -rf /Users/owner/Documents/Pare-iOS
```

**Before deleting**:
1. Open `/Users/owner/Documents/Pare/ios/Pare.xcodeproj`
2. Fix file references
3. Build successfully (`Cmd+B`)
4. Run successfully (`Cmd+R`)
5. Then safe to delete old directory

---

## Benefits of New Structure

### Professional Monorepo
- ✅ Next.js and iOS in one repo
- ✅ Shared documentation
- ✅ Single git repository
- ✅ Easy cross-platform development

### Better Organization
- ✅ iOS app clearly nested under `ios/`
- ✅ Proper folder structure (Models, Services, ViewModels, Views)
- ✅ All config files in logical locations

### Industry Standard
- ✅ Matches patterns from React Native, Flutter, Ionic
- ✅ Clear separation of concerns
- ✅ Easy for new developers to navigate

---

## Testing Checklist

After opening in Xcode:

- [ ] Open `/Users/owner/Documents/Pare/ios/Pare.xcodeproj`
- [ ] Fix file references (red files)
- [ ] Verify Config.xcconfig linked
- [ ] Clean build (`Cmd+Shift+K`)
- [ ] Build project (`Cmd+B`)
- [ ] Run in Simulator (`Cmd+R`)
- [ ] Verify app loads
- [ ] Check console for success logs
- [ ] Delete old `/Users/owner/Documents/Pare-iOS/` directory

---

## Troubleshooting

### Issue: "Cannot find files"

**Cause**: Xcode project still references old paths

**Fix**: Follow "Manual Steps Required in Xcode" above

### Issue: "Config not found"

**Cause**: Config.xcconfig not linked to project

**Fix**:
1. Project settings → Info tab
2. Set Debug/Release configurations to "Config"

### Issue: "Build fails"

**Cause**: Files not added to target

**Fix**:
1. Select each Swift file
2. File Inspector → Target Membership
3. Check "Pare" target

---

## Success Criteria

✅ Xcode project opens from `/Documents/Pare/ios/Pare.xcodeproj`  
✅ All Swift files visible in Project Navigator  
✅ No red (missing) files  
✅ Project builds successfully  
✅ App runs in Simulator  
✅ Console shows data loading

---

## Graduation to CLAUDE.md

**Status**: No promotion needed

**Reason**: This is a one-time reorganization, not a reusable pattern

**Reference**: Monorepo structure documented here

---

**Reorganization complete!** Open the project and fix file references. 🚀


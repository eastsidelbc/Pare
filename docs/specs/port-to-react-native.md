---
source_of_truth: PROJECT_PLAN.md
rules_reference: CLAUDE.md
branch: docs-refactor
last_moved: 2025-10-19
---

> _This document is maintained under `/docs-refactor` branch and aligns with CLAUDE.md and PROJECT_PLAN.md._

# React Native Port Plan: Structure Parity

**Date**: 2025-10-19  
**Target**: React Native (New Architecture + Hermes)  
**Goal**: 1:1 structure parity with web app  
**Timeline**: 8-12 weeks (2 engineers)

---

## Executive Summary

The Pare web app is an **excellent candidate** for React Native conversion due to:

✅ **Zero external dependencies** (no complex animations, no heavy libraries)  
✅ **Clean hook-based architecture** (easy to share business logic)  
✅ **Self-contained data layer** (CSV → API → hooks → UI)  
✅ **Mobile-first design** (already optimized for touch/small screens)  
✅ **Type-safe TypeScript** (shared types between web + native)

**Port Strategy**: Create **RN app with identical structure**, reusing ~70% of business logic (hooks, utilities, types) and rebuilding UI layer with native components.

**Estimated Split**:
- **30% Rewrite**: UI components (RN equivalents)
- **70% Reuse**: Business logic, data flow, calculations

---

## 1. Component Mapping Table

### Web → React Native Component Equivalents

| Web Component | React Native Equivalent | Shared Logic | Notes |
|---------------|------------------------|--------------|-------|
| **`<div>`** | `<View>` | 100% | Direct mapping |
| **`<span>`, `<p>`** | `<Text>` | 100% | Add `<Text>` wrappers |
| **`<select>`** | Custom `<Picker>` or Modal | 90% | Use RN modal + list |
| **`<button>`** | `<Pressable>` or `<TouchableOpacity>` | 100% | Touch feedback |
| **Tailwind CSS** | StyleSheet + utility lib | 0% | Use `styled-components` or `tamagui` |
| **`@floating-ui/react`** | `react-native-reanimated` + `react-native-gesture-handler` | 0% | Custom dropdown positioning |
| **`framer-motion`** | `react-native-reanimated` | 0% | Native animations (better performance) |
| **`next/image`** | `<Image>` from RN | 100% | Direct mapping |
| **`useEffect`** | `useEffect` | 100% | Identical API |
| **`fetch()`** | `fetch()` | 100% | Identical API (Hermes supports fetch) |

**File Reference**: Full mapping detailed in sections below

### Library Recommendations

| Feature | Web Library | RN Equivalent | Reason |
|---------|-------------|---------------|--------|
| **Lists** | `<div>` | **FlashList** | 10x faster than FlatList, handles 1000+ items |
| **Animations** | Framer Motion | **Reanimated 3** | 60fps native animations, runs on UI thread |
| **Gestures** | Mouse events | **Gesture Handler** | Native touch gestures (swipe, pan, etc.) |
| **Charts/Bars** | CSS gradients | **React Native Skia** | Hardware-accelerated 2D graphics |
| **Storage** | localStorage | **MMKV** | 30x faster than AsyncStorage |
| **Navigation** | Next.js routing | **React Navigation** | Native stack navigator |
| **Forms** | HTML inputs | **React Hook Form** (RN version) | Same API as web |
| **Dropdowns** | Floating UI | Custom Modal + Reanimated | Native feel |

**Package List**:
```json
{
  "dependencies": {
    "react-native": "^0.75.0",
    "react": "19.0.0",
    "@shopify/flash-list": "^1.7.0",
    "react-native-reanimated": "^3.15.0",
    "react-native-gesture-handler": "^2.19.0",
    "@shopify/react-native-skia": "^1.5.0",
    "react-native-mmkv": "^3.0.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.11.0"
  }
}
```

**Total Bundle Size**: ~8MB (RN core) + ~2MB (libraries) = **~10MB app**

---

## 2. Shared Packages Architecture

### Monorepo Structure (Recommended)

```
pare-monorepo/
├── packages/
│   ├── shared-models/          # TypeScript types & interfaces
│   │   ├── src/
│   │   │   ├── TeamData.ts     # interface TeamData { ... }
│   │   │   ├── ApiResponse.ts  # interface ApiResponse { ... }
│   │   │   ├── MetricConfig.ts # AVAILABLE_METRICS definition
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── shared-utils/           # Pure TS utilities (UI-agnostic)
│   │   ├── src/
│   │   │   ├── calculations/
│   │   │   │   ├── barCalculation.ts    # Bar width math (no hooks)
│   │   │   │   ├── rankCalculation.ts   # Ranking logic
│   │   │   │   └── displayMode.ts       # Per-game conversion
│   │   │   ├── formatting/
│   │   │   │   ├── metricFormat.ts      # formatMetricValue()
│   │   │   │   ├── numberFormat.ts      # Currency, decimals, etc.
│   │   │   │   └── teamHelpers.ts       # isAverageTeam(), etc.
│   │   │   └── color-scales/
│   │   │       ├── teamColors.ts        # Team A/B color mappings
│   │   │       └── gradients.ts         # Gradient definitions
│   │   └── package.json
│   │
│   ├── shared-data/            # Data fetching & caching
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── fetchNflStats.ts     # fetch() wrapper
│   │   │   │   ├── cacheManager.ts      # In-memory + MMKV cache
│   │   │   │   └── apiClient.ts         # Base API client
│   │   │   └── mappers/
│   │   │       ├── apiTransform.ts      # API → UI data transform
│   │   │       └── csvParser.ts         # CSV parsing (if needed)
│   │   └── package.json
│   │
│   └── shared-hooks/           # React hooks (web + RN compatible)
│       ├── src/
│       │   ├── useNflStats.ts           # Data fetching hook
│       │   ├── useRanking.ts            # Ranking calculations
│       │   ├── useBarCalculation.ts     # Bar width hook
│       │   ├── useDisplayMode.ts        # Per-game toggle
│       │   └── useTheme.ts              # Theme management
│       └── package.json
│
├── apps/
│   ├── web/                    # Next.js web app (existing)
│   │   ├── app/
│   │   ├── components/
│   │   └── package.json
│   │
│   └── mobile/                 # React Native app (NEW)
│       ├── src/
│       │   ├── components/
│       │   ├── screens/
│       │   ├── navigation/
│       │   └── App.tsx
│       ├── android/
│       ├── ios/
│       └── package.json
│
└── package.json               # Root workspace config
```

**Workspace Tool**: Use **Turborepo** or **Yarn Workspaces**

```json
// Root package.json
{
  "name": "pare-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev:web": "cd apps/web && npm run dev",
    "dev:mobile": "cd apps/mobile && npm run start",
    "build:shared": "turbo run build --filter=shared-*",
    "test": "turbo run test"
  }
}
```

**File Reference**: Proposed structure (not yet implemented)

---

## 3. React Native Navigation & Layout

### Navigation Structure

**Web** (Next.js App Router):
```
/                    → Landing page
/compare             → Main comparison
```

**React Native** (React Navigation):
```
<NavigationContainer>
  <Drawer.Navigator>  {/* Left rail scoreboard */}
    <Stack.Navigator>
      <Stack.Screen name="Compare" component={CompareScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  </Drawer.Navigator>
</NavigationContainer>
```

**Code Example**:

```tsx
// apps/mobile/src/navigation/RootNavigator.tsx

import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,  // Custom header
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="Compare" component={CompareScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        screenOptions={{
          drawerType: 'slide',
          drawerStyle: {
            width: 280,
            backgroundColor: '#0f172a'
          }
        }}
        drawerContent={(props) => <ScoreboardDrawer {...props} />}
      >
        <Drawer.Screen 
          name="Main" 
          component={MainStack}
          options={{ headerShown: false }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
```

**File Reference**: Proposed location: `apps/mobile/src/navigation/RootNavigator.tsx`

### Mobile-First Layout Spec

**Screen Structure** (matches web mobile layout):

```
┌─────────────────────────────────────────┐
│ TopBar (64px)                           │
│  ├─ [☰] Menu                            │
│  ├─ "PARE" Logo                         │
│  └─ [⚙️] Settings                       │
├─────────────────────────────────────────┤
│ ScrollView Content                      │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ CompactPanel (Offense)              │ │
│ │  ├─ CompactPanelHeader              │ │
│ │  └─ CompactComparisonRow (×N)       │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ───── Separator ─────                   │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ CompactPanel (Defense)              │ │
│ └─────────────────────────────────────┘ │
│                                          │
├─────────────────────────────────────────┤
│ BottomTabBar (64px)                     │
│  ├─ Compare (active)                    │
│  ├─ Stats                               │
│  └─ Settings                            │
└─────────────────────────────────────────┘
```

**React Native Implementation**:

```tsx
// apps/mobile/src/screens/CompareScreen.tsx

import { View, ScrollView, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNflStats } from '@pare/shared-hooks';
import { CompactPanel } from '../components/CompactPanel';
import { TopBar } from '../components/TopBar';

export function CompareScreen() {
  const insets = useSafeAreaInsets();
  const { offenseData, defenseData, isLoading } = useNflStats();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      {/* TopBar - Fixed */}
      <TopBar />
      
      {/* ScrollView Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 64 + 8  // Bottom tab bar + spacing
        }}
      >
        {/* Offense Panel */}
        <CompactPanel
          type="offense"
          data={offenseData}
          isLoading={isLoading}
        />
        
        {/* Separator */}
        <View style={{
          height: 1,
          backgroundColor: 'rgba(139, 92, 246, 0.2)',
          marginVertical: 8
        }} />
        
        {/* Defense Panel */}
        <CompactPanel
          type="defense"
          data={defenseData}
          isLoading={isLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
```

**File Reference**: Proposed location: `apps/mobile/src/screens/CompareScreen.tsx`

---

## 4. Component Conversions (Detailed)

### Example 1: CompactComparisonRow (Web → RN)

**Web Version** (`components/mobile/CompactComparisonRow.tsx:124-206`):

```tsx
export default function CompactComparisonRow({...}) {
  return (
    <div className="relative mb-2">
      {/* Line 1: Data + Ranks */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-[15px] font-semibold text-white">
            {formattedA}
          </span>
          <CompactRankingDropdown {...} />
        </div>
        
        <div className="flex-1 text-center px-2">
          <span className="text-[13px] font-medium text-slate-300">
            {metricConfig.name}
          </span>
        </div>
        
        <div className="flex items-baseline gap-1">
          <CompactRankingDropdown {...} />
          <span className="text-[15px] font-semibold text-white">
            {formattedB}
          </span>
        </div>
      </div>
      
      {/* Line 2: Bars (edge-to-edge) */}
      <div className="h-[6px] flex">
        <div style={{
          width: `${teamAPercentage}%`,
          background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
        }} />
        <div style={{
          width: `${teamBPercentage}%`,
          background: 'linear-gradient(90deg, #F97316 0%, #EA580C 100%)'
        }} />
      </div>
    </div>
  );
}
```

**React Native Version** (NEW):

```tsx
// apps/mobile/src/components/CompactComparisonRow.tsx

import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useBarCalculation } from '@pare/shared-hooks';
import { CompactRankingDropdown } from './CompactRankingDropdown';

export function CompactComparisonRow({
  metricField,
  teamA,
  teamB,
  teamAData,
  teamBData,
  allData,
  panelType
}) {
  // ✅ REUSE: Same hook from web
  const { teamAPercentage, teamBPercentage } = useBarCalculation({
    teamAValue: String(teamAData[metricField]),
    teamBValue: String(teamBData[metricField]),
    teamARanking,
    teamBRanking,
    panelType
  });
  
  // ✅ REUSE: Same formatting logic
  const formattedA = formatMetricValue(teamAData[metricField], metricConfig.format);
  const formattedB = formatMetricValue(teamBData[metricField], metricConfig.format);
  
  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      {/* Line 1: Data + Ranks */}
      <View style={styles.dataRow}>
        {/* Team A: Value + Rank */}
        <View style={styles.teamSection}>
          <Text style={styles.valueText}>{formattedA}</Text>
          <CompactRankingDropdown
            allData={allData}
            metricKey={metricField}
            currentTeam={teamA}
            panelType={panelType}
            onTeamChange={onTeamAChange}
            position="left"
          />
        </View>
        
        {/* Center: Metric Name */}
        <View style={styles.metricCenter}>
          <Text style={styles.metricText}>
            {metricConfig.name.toUpperCase()}
          </Text>
        </View>
        
        {/* Team B: Rank + Value */}
        <View style={styles.teamSection}>
          <CompactRankingDropdown
            allData={allData}
            metricKey={metricField}
            currentTeam={teamB}
            panelType={panelType}
            onTeamChange={onTeamBChange}
            position="right"
          />
          <Text style={styles.valueText}>{formattedB}</Text>
        </View>
      </View>
      
      {/* Line 2: Bars (edge-to-edge with LinearGradient) */}
      <View style={styles.barContainer}>
        {/* Team A Bar - GREEN */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.bar, { width: `${teamAPercentage}%` }]}
        />
        
        {/* Team B Bar - ORANGE */}
        <LinearGradient
          colors={['#F97316', '#EA580C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.bar, { width: `${teamBPercentage}%` }]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  teamSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff'
  },
  metricCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8
  },
  metricText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#cbd5e1',  // slate-300
    letterSpacing: 0.5
  },
  barContainer: {
    height: 6,
    flexDirection: 'row',
    overflow: 'hidden'
  },
  bar: {
    height: '100%'
  }
});
```

**Reuse Percentage**: ~80% (hooks, calculations, formatting)

**File Reference**: Proposed location: `apps/mobile/src/components/CompactComparisonRow.tsx`

### Example 2: Ranking Dropdown (Modal Implementation)

**Web Version**: Floating UI portal with auto-positioning

**React Native Version**: Bottom sheet modal (native feel)

```tsx
// apps/mobile/src/components/CompactRankingDropdown.tsx

import { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calculateBulkRanking } from '@pare/shared-hooks';

export function CompactRankingDropdown({
  allData,
  metricKey,
  currentTeam,
  panelType,
  onTeamChange,
  position  // 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  
  // ✅ REUSE: Same ranking logic as web
  const allTeamRankings = calculateBulkRanking(
    allData,
    metricKey,
    allData.map(t => t.team),
    { higherIsBetter: panelType === 'offense' }
  );
  
  const sortedTeams = Object.entries(allTeamRankings)
    .filter(([_, ranking]) => ranking !== null)
    .sort((a, b) => a[1].rank - b[1].rank);
  
  return (
    <>
      {/* Trigger Button */}
      <Pressable
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.rankBadge,
          pressed && styles.rankBadgePressed
        ]}
      >
        <Text style={styles.rankText}>
          {allTeamRankings[currentTeam]?.formattedRank || 'N/A'}
        </Text>
      </Pressable>
      
      {/* Modal Bottom Sheet */}
      <Modal
        visible={isOpen}
        animationType="none"
        transparent
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          
          <Animated.View
            entering={SlideInDown.springify()}
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + 16 }
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Team</Text>
              <Pressable onPress={() => setIsOpen(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </Pressable>
            </View>
            
            {/* Team List */}
            <ScrollView style={styles.teamList}>
              {sortedTeams.map(([teamName, ranking]) => (
                <Pressable
                  key={teamName}
                  onPress={() => {
                    onTeamChange(teamName);
                    setIsOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.teamRow,
                    teamName === currentTeam && styles.teamRowActive,
                    pressed && styles.teamRowPressed
                  ]}
                >
                  <Text style={styles.rankEmoji}>
                    {ranking.rank === 1 ? '🥇' : 
                     ranking.rank === 2 ? '🥈' : 
                     ranking.rank === 3 ? '🥉' : ''}
                  </Text>
                  <Text style={styles.rankNumber}>
                    {ranking.formattedRank}
                  </Text>
                  <Text style={styles.teamName}>{teamName}</Text>
                  <Text style={styles.teamValue}>
                    {allData.find(t => t.team === teamName)?.[metricKey]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)'
  },
  rankBadgePressed: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)'
  },
  rankText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#ffffff'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff'
  },
  closeButton: {
    fontSize: 24,
    color: '#94a3b8'
  },
  teamList: {
    maxHeight: 400
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(71, 85, 105, 0.3)'
  },
  teamRowActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)'
  },
  teamRowPressed: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)'
  },
  rankEmoji: {
    fontSize: 16,
    width: 24
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    width: 40
  },
  teamName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff'
  },
  teamValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0'
  }
});
```

**Reuse Percentage**: ~90% (ranking logic, sorting, display logic)

**File Reference**: Proposed location: `apps/mobile/src/components/CompactRankingDropdown.tsx`

---

## 5. Live Data Transport (RN-Specific)

### Polling Implementation (Same as Web)

```tsx
// packages/shared-hooks/src/useLiveScores.ts

import { useEffect, useState } from 'react';

export function useLiveScores() {
  const [scores, setScores] = useState<GameScore[]>([]);
  const [isLive, setIsLive] = useState(false);
  
  useEffect(() => {
    const fetchScores = async () => {
      const response = await fetch('https://api.pare.com/live/scores');
      const data = await response.json();
      setScores(data.games);
      setIsLive(data.isLive);
    };
    
    fetchScores();
    const interval = setInterval(fetchScores, 5000);  // 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return { scores, isLive };
}
```

**Works identically on web + RN!** ✅

### WebSocket Upgrade (RN-Native)

```tsx
// packages/shared-hooks/src/useLiveScoresWS.ts

import { useEffect, useState } from 'react';

export function useLiveScoresWS() {
  const [scores, setScores] = useState<GameScore[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket('wss://api.pare.com/live');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setScores(data.games);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket closed, reconnecting...');
      // Add reconnection logic
    };
    
    return () => ws.close();
  }, []);
  
  return { scores };
}
```

**Works identically on web + RN!** ✅

---

## 6. Acceptance Criteria: Structure Parity

### Side-by-Side Comparison Matrix

| Feature | Web | RN Expected | Acceptance Criteria |
|---------|-----|-------------|---------------------|
| **Layout** | Desktop + Mobile | Mobile-only | ✅ Identical to web mobile layout |
| **Panels** | Offense + Defense | Offense + Defense | ✅ Same structure, 1:1 mapping |
| **Comparison Rows** | Two-line (data + bars) | Two-line (data + bars) | ✅ Identical visual structure |
| **Bar Width Math** | `useBarCalculation` | `useBarCalculation` | ✅ Same hook, same results |
| **Rankings** | Client-side | Client-side | ✅ Same `useRanking` hook |
| **Display Mode** | Per-game ⟷ Total | Per-game ⟷ Total | ✅ Same toggle behavior |
| **Dropdowns** | Floating UI | Bottom sheet modal | ⚠️ Different UI, same data flow |
| **Team Selection** | Global state (props) | Global state (props) | ✅ Identical architecture |
| **Data Fetching** | `useNflStats` | `useNflStats` | ✅ Same hook |
| **Caching** | Service Worker + API | MMKV + API | ⚠️ Different storage, same TTL |
| **Animations** | Framer Motion | Reanimated 3 | ⚠️ Different library, same effect |
| **Performance** | 50ms cached | 50ms cached | ✅ Same target |

**Legend**:
- ✅ Identical implementation
- ⚠️ Different implementation, same behavior

### Props & Data Shapes (Identical)

**Web CompactComparisonRow Props**:
```typescript
interface CompactComparisonRowProps {
  metricField: string;
  teamA: string;
  teamB: string;
  teamAData: TeamData | null;
  teamBData: TeamData | null;
  allData: TeamData[];
  panelType: 'offense' | 'defense';
  displayMode: 'per-game' | 'total';
  onTeamAChange?: (team: string) => void;
  onTeamBChange?: (team: string) => void;
}
```

**RN CompactComparisonRow Props**: **IDENTICAL** ✅

No changes needed! Props interface shared via `@pare/shared-models`.

---

## 7. Performance Targets (RN-Specific)

### Cold Start Time

| Metric | Target | Notes |
|--------|--------|-------|
| **App Launch** | < 2s | From tap to first frame |
| **Data Load** | < 1.5s | Cached data (MMKV) |
| **Network Fetch** | < 2s | Fresh data (4G LTE) |
| **Total TTI** | < 3.5s | Time to interactive |

### Frame Time (60fps = 16.67ms/frame)

| Operation | Target | Library Used |
|-----------|--------|--------------|
| **Scroll** | 60fps | FlashList |
| **Dropdown Open** | 60fps | Reanimated 3 (UI thread) |
| **Bar Animation** | 60fps | Reanimated 3 |
| **Mode Toggle** | 60fps | Reanimated 3 |
| **Team Change** | 60fps | Reanimated 3 |

### Bundle Size

| Platform | Target | Actual (Estimated) |
|----------|--------|---------------------|
| **iOS** | < 15MB | ~12MB |
| **Android** | < 20MB | ~18MB |

**Optimization Strategies**:
- Use Hermes JS engine (30% smaller bundle)
- Enable ProGuard (Android) / App Thinning (iOS)
- Lazy load non-critical screens
- Use vector icons (not PNGs)

---

## 8. Platform-Specific Considerations

### iOS-Specific

**Safe Area Handling**:
```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CompareScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{
      paddingTop: insets.top,      // Notch/Dynamic Island
      paddingBottom: insets.bottom  // Home indicator
    }}>
      {/* Content */}
    </View>
  );
}
```

**Native Features**:
- Haptic feedback on team selection (`Haptics.impactAsync('light')`)
- Dark mode support (`useColorScheme()`)
- Dynamic Type (respect user font size)

### Android-Specific

**Material Design Compliance**:
- Use `TouchableNativeFeedback` (ripple effect)
- Respect Android back button
- Handle soft keyboard (adjust scroll position)

**Performance**:
- Enable Hermes engine
- Use `android:largeHeap="true"` (if needed)
- Optimize images with WebP format

---

## 9. Testing Strategy

### Unit Tests (Shared Logic)

```typescript
// packages/shared-utils/src/__tests__/barCalculation.test.ts

import { calculateBarWidths } from '../calculations/barCalculation';

describe('Bar Width Calculation', () => {
  it('calculates proportional widths', () => {
    const result = calculateBarWidths({
      teamAValue: 100,
      teamBValue: 50,
      teamARanking: { rank: 1 },
      teamBRanking: { rank: 15 },
      panelType: 'offense'
    });
    
    expect(result.teamAPercentage).toBeGreaterThan(65);
    expect(result.teamBPercentage).toBeLessThan(33);
    expect(result.teamAPercentage + result.teamBPercentage).toBeCloseTo(98, 1);
  });
});
```

### Integration Tests (RN-Specific)

```typescript
// apps/mobile/src/__tests__/CompareScreen.test.tsx

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CompareScreen } from '../screens/CompareScreen';

describe('CompareScreen', () => {
  it('renders offense and defense panels', async () => {
    const { getByText } = render(<CompareScreen />);
    
    await waitFor(() => {
      expect(getByText('OFFENSE')).toBeTruthy();
      expect(getByText('DEFENSE')).toBeTruthy();
    });
  });
  
  it('changes teams when dropdown selection made', async () => {
    const { getByTestId, getByText } = render(<CompareScreen />);
    
    fireEvent.press(getByTestId('teamA-dropdown'));
    fireEvent.press(getByText('Buffalo Bills'));
    
    await waitFor(() => {
      expect(getByText('Buffalo Bills')).toBeTruthy();
    });
  });
});
```

### E2E Tests (Detox)

```typescript
// apps/mobile/e2e/compare.e2e.ts

describe('Compare Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });
  
  it('should load compare screen', async () => {
    await expect(element(by.text('OFFENSE'))).toBeVisible();
    await expect(element(by.text('DEFENSE'))).toBeVisible();
  });
  
  it('should toggle display mode', async () => {
    await element(by.id('display-mode-toggle')).tap();
    await expect(element(by.text('TOTAL'))).toBeVisible();
  });
  
  it('should open ranking dropdown', async () => {
    await element(by.id('rank-badge-teamA')).tap();
    await expect(element(by.text('Buffalo Bills'))).toBeVisible();
  });
});
```

---

## 10. Timeline & Milestones (8-12 Weeks)

### Phase 1: Foundation (Week 1-2)

**Tasks**:
- [ ] Set up monorepo structure (Turborepo)
- [ ] Create `shared-models`, `shared-utils`, `shared-hooks` packages
- [ ] Extract and test business logic from web app
- [ ] Initialize RN project (Expo or vanilla RN)
- [ ] Set up navigation (React Navigation)

**Deliverable**: Empty RN app with shared packages working

### Phase 2: Core UI (Week 3-5)

**Tasks**:
- [ ] Build `CompactPanel` component
- [ ] Build `CompactComparisonRow` component
- [ ] Build `TopBar` and `BottomTabBar`
- [ ] Implement bar gradients (Skia or LinearGradient)
- [ ] Wire up `useNflStats` hook

**Deliverable**: Basic comparison view (no dropdowns)

### Phase 3: Interactions (Week 6-8)

**Tasks**:
- [ ] Build `CompactRankingDropdown` (modal version)
- [ ] Build `CompactTeamSelector` (modal version)
- [ ] Implement display mode toggle
- [ ] Add animations (Reanimated 3)
- [ ] Wire up all callbacks

**Deliverable**: Fully interactive comparison view

### Phase 4: Polish & Performance (Week 9-10)

**Tasks**:
- [ ] Optimize scroll performance (FlashList)
- [ ] Add haptic feedback
- [ ] Implement MMKV caching
- [ ] Dark mode support
- [ ] Accessibility (VoiceOver, TalkBack)

**Deliverable**: Production-ready app

### Phase 5: Left Rail & Live Data (Week 11-12)

**Tasks**:
- [ ] Build `ScoreboardDrawer` component
- [ ] Implement `useLiveScores` hook (polling)
- [ ] Add WebSocket support (optional)
- [ ] Wire up game selection flow

**Deliverable**: Complete feature parity with web

---

## 11. Risk Mitigation

### High-Risk Areas

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Dropdown UX different from web** | High | Medium | Use native patterns (bottom sheets), test extensively |
| **Performance on low-end devices** | Medium | High | Use FlashList, Reanimated, optimize early |
| **Bar gradients look different** | Medium | Low | Use Skia for pixel-perfect rendering |
| **MMKV cache not working** | Low | Medium | Implement fallback to AsyncStorage |
| **Live data polling drains battery** | Medium | Medium | Use background fetch API, limit frequency |

### Contingency Plans

**If FlashList performance insufficient**:
- Fall back to `FlatList` with `getItemLayout` optimization
- Reduce default visible metrics to 3 per panel

**If Skia too complex**:
- Use simple `LinearGradient` from `expo-linear-gradient`
- Accept minor visual differences

**If monorepo causes issues**:
- Start with single RN repo, extract packages later
- Use symbolic links for shared code

---

## Summary

The Pare web app is **perfectly suited** for React Native conversion due to its clean architecture and hook-based design. Key advantages:

✅ **70% code reuse** (hooks, utilities, types)  
✅ **Identical data flow** (same API, same hooks)  
✅ **Native performance** (Reanimated, FlashList, Skia)  
✅ **Structure parity** (1:1 component mapping)  
✅ **Shared business logic** (no duplication)

**Estimated Timeline**: 8-12 weeks (2 engineers)  
**Estimated Bundle Size**: ~12MB iOS, ~18MB Android  
**Performance Target**: 60fps interactions, < 3.5s TTI

**Next Steps**:
1. Set up monorepo structure
2. Extract shared packages
3. Build RN prototype (Weeks 1-3)
4. Review prototype with team
5. Proceed with full build-out

---

**End of RN Port Plan**


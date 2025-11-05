# MOBILE_PLAN.md — Queued Next Track (Post-Web v1)

---

## 🎯 Goal
Convert Pare from Web PWA to Native iOS app using Swift / SwiftUI with shared API core.  
This phase begins **after Web Phases 4–9 ship**.

---

## 📱 6-Phase iOS Development Strategy
| Phase | Focus | Outcome |
|--------|--------|----------|
| 0 | Repo & Runtime Hygiene | iOS structure ready; health endpoint verified |
| 1 | Project Bootstrap | SwiftUI skeleton fetches API |
| 2 | Core UX | Native parity with web Compare flow |
| 3 | System Integrations | Share sheet, settings, Siri shortcuts |
| 4 | Polish & Performance | App Store-quality finish |
| 5 | Distribution | TestFlight → App Store |

---

## 🔧 Shared Infrastructure
- Reuse Next.js API routes as iOS data source.  
- Base URL: HTTPS Cloudflare-tunneled domain.  
- ETags / URLCache for offline support.

---

## 📦 Swift Components
- `StatsAPI.swift` → Async/await network layer.  
- `Team.swift` / `Metric.swift` → Mirror API models.  
- `CompareView.swift` / `MetricRowView.swift` → Native UI with inward bars.  
- `Config.xcconfig` → No secrets; environment keys only.

---

## 🚦 Gate Questions
- Minimum iOS version (16 or 17)?  
- Dark mode only or dual theme?  
- Portrait or both orientations?  
- Caching policy duration?  
- Monetization after launch or at v1?

---

## 🧪 Definition of Done
- ✅ App compiles & fetches live data  
- ✅ Compare view functional offline  
- ✅ Performance & accessibility passes  
- ✅ Submitted to App Store with metadata  

---

*End of MOBILE_PLAN.md*

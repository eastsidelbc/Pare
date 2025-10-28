# Mobile API Documentation for iOS Development

**Last Updated**: 2025-10-10  
**For**: iOS SwiftUI Native App  
**Backend**: Next.js 15 App Router  
**See Also**: `docs/devnotes/2025-10-10-api-audit.md`

---

## Base URLs

| Environment | URL | HTTPS | Status |
|-------------|-----|-------|--------|
| **Development** | `http://localhost:4000` | ❌ No | ✅ Works with Simulator |
| **Production** | `https://yourdomain.com` | ✅ Required | ⚠️ TO CONFIGURE |

**Note**: iOS Simulator can connect to localhost. Physical devices require HTTPS for ATS compliance.

---

## Authentication

**None required** - All endpoints return public NFL statistics data.

---

## Rate Limiting

**None** - No rate limiting currently implemented.

---

## API Endpoints

### 1. Health Check

**Endpoint**: `GET /api/health`

**Purpose**: Backend availability check (iOS App Store requirement)

**Request**: No parameters

**Response** (200 OK):
```json
{
  "ok": true,
  "version": "1.0.0",
  "timestamp": "2025-10-10T12:34:56.789Z",
  "uptime": 3600,
  "endpoints": {
    "offense": "available",
    "defense": "available"
  },
  "environment": "production"
}
```

**Headers**:
```
Cache-Control: no-cache, no-store, must-revalidate
Content-Type: application/json
X-Health-Check: ok
```

**Usage**:
- Call on app launch to verify backend availability
- Display offline banner if unreachable
- Retry with exponential backoff on failure

**Swift Example**:
```swift
struct HealthResponse: Codable {
  let ok: Bool
  let version: String
  let timestamp: String
  let uptime: Int
  let endpoints: EndpointStatus
  let environment: String
}

struct EndpointStatus: Codable {
  let offense: String
  let defense: String
}
```

---

### 2. Offense Stats

**Endpoint**: `GET /api/nfl-2025/offense`

**Purpose**: Fetch offense statistics for all 32 NFL teams

**Request**: No parameters

**Response** (200 OK):
```json
{
  "season": 2025,
  "type": "offense",
  "updatedAt": "2025-10-10T10:30:00.000Z",
  "rows": [
    {
      "team": "Baltimore Ravens",
      "g": "9",
      "points": "275.4",
      "total_yards": "3880.8",
      "plays_offense": "627.0",
      "yds_per_play_offense": "6.2",
      "turnovers": "12.0",
      "fumbles_lost": "5.0",
      "first_down": "204.0",
      "pass_cmp": "213.0",
      "pass_att": "334.0",
      "pass_yds": "2568.6",
      "pass_td": "18.0",
      "pass_int": "7.0",
      "pass_net_yds_per_att": "7.5",
      "pass_fd": "124.0",
      "rush_att": "293.0",
      "rush_yds": "1312.2",
      "rush_td": "15.0",
      "rush_yds_per_att": "4.5",
      "rush_fd": "80.0",
      "penalties": "58.0",
      "penalties_yds": "512.0",
      "pen_fd": "20.0",
      "score_pct": "45.2",
      "turnover_pct": "1.9",
      "exp_pts_tot": "72.8"
    }
    // ... 31 more teams (32 total)
  ]
}
```

**Response (Stale Cache)** (200 OK):
```json
{
  "season": 2025,
  "type": "offense",
  "updatedAt": "2025-10-10T08:00:00.000Z",
  "rows": [ /* cached data */ ],
  "stale": true,
  "error": "CSV file read failed: ENOENT"
}
```

**Response (Error)** (500):
```json
{
  "error": "Failed to fetch offense data",
  "message": "CSV file read failed: ENOENT",
  "requestId": "abc123def456",
  "timestamp": "2025-10-10T12:34:56.789Z",
  "details": {
    "url": "https://www.pro-football-reference.com/years/2025/#team_stats",
    "cacheStatus": "UNAVAILABLE",
    "errorType": "Error"
  }
}
```

**Headers**:
```
Cache-Control: public, max-age=300
Content-Type: application/json
X-Cache: HIT | MISS | STALE
X-Request-ID: unique-request-id
X-Processing-Time: 52ms (MISS only)
```

**Cache Strategy**:
- **Server**: 6 hours (21,600 seconds)
- **Client (iOS)**: Recommended 6 hours, configurable
- **Stale-While-Revalidate**: Server may return stale data with warning

**Update Frequency**: Weekly during NFL season (manual CSV updates)

**Swift Example**:
```swift
struct StatsResponse: Codable {
  let season: Int
  let type: String
  let updatedAt: String
  let rows: [TeamStats]
  let stale: Bool?
  let error: String?
}

struct TeamStats: Codable {
  let team: String
  let g: String
  let points: String
  let totalYards: String
  let playsOffense: String
  let ydsPerPlayOffense: String
  let turnovers: String
  let fumblesLost: String
  let firstDown: String
  let passCmp: String
  let passAtt: String
  let passYds: String
  let passTd: String
  let passInt: String
  let passNetYdsPerAtt: String
  let passFd: String
  let rushAtt: String
  let rushYds: String
  let rushTd: String
  let rushYdsPerAtt: String
  let rushFd: String
  let penalties: String
  let penaltiesYds: String
  let penFd: String
  let scorePct: String
  let turnoverPct: String
  let expPtsTot: String
  
  enum CodingKeys: String, CodingKey {
    case team, g, points
    case totalYards = "total_yards"
    case playsOffense = "plays_offense"
    case ydsPerPlayOffense = "yds_per_play_offense"
    case turnovers, fumblesLost = "fumbles_lost"
    case firstDown = "first_down"
    case passCmp = "pass_cmp", passAtt = "pass_att"
    case passYds = "pass_yds", passTd = "pass_td", passInt = "pass_int"
    case passNetYdsPerAtt = "pass_net_yds_per_att"
    case passFd = "pass_fd"
    case rushAtt = "rush_att", rushYds = "rush_yds", rushTd = "rush_td"
    case rushYdsPerAtt = "rush_yds_per_att", rushFd = "rush_fd"
    case penalties, penaltiesYds = "penalties_yds", penFd = "pen_fd"
    case scorePct = "score_pct", turnoverPct = "turnover_pct"
    case expPtsTot = "exp_pts_tot"
  }
}
```

---

### 3. Defense Stats

**Endpoint**: `GET /api/nfl-2025/defense`

**Purpose**: Fetch defense statistics for all 32 NFL teams (opponent stats)

**Request**: No parameters

**Response**: Identical structure to `/api/nfl-2025/offense` (same fields, different values)

**Cache Strategy**: Same as offense endpoint (separate cache)

**Swift Example**: Use same `StatsResponse` and `TeamStats` structs as offense

---

### 4. Preferences (Stub)

**Endpoint**: 
- `GET /api/preferences`
- `PUT /api/preferences`

**Status**: ⚠️ Stub implementation (not functional)

**GET Response**:
```json
{
  "ok": true,
  "prefs": {}
}
```

**PUT Response**:
```json
{
  "ok": true,
  "saved": false,
  "message": "Preferences persistence not implemented yet"
}
```

**Recommendation**: Ignore for iOS v1.0 (use UserDefaults for local preferences)

---

## Error Handling

### Error Types

| Scenario | Status Code | Response |
|----------|-------------|----------|
| Success (fresh) | 200 OK | Normal response |
| Success (cached) | 200 OK | Normal response + `X-Cache: HIT` |
| Stale data | 200 OK | Response with `stale: true` and `error` message |
| No cache, fetch failed | 500 | Error object with details |

### iOS Error Handling Strategy

```swift
func fetchOffenseStats() async throws -> StatsResponse {
  let response = try await api.get("/api/nfl-2025/offense")
  
  // Check for stale data warning
  if response.stale == true {
    logger.warning("Using stale data: \(response.error ?? "unknown")")
    // Show warning banner in UI (optional)
  }
  
  return response
}
```

### Recommended Retry Logic

```swift
func fetchWithRetry<T>(
  _ request: @escaping () async throws -> T,
  maxAttempts: Int = 3
) async throws -> T {
  var lastError: Error?
  
  for attempt in 1...maxAttempts {
    do {
      return try await request()
    } catch {
      lastError = error
      if attempt < maxAttempts {
        let delay = pow(2.0, Double(attempt)) // Exponential backoff
        try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
      }
    }
  }
  
  throw lastError ?? APIError.unknown
}
```

---

## iOS ATS (App Transport Security)

### Requirements

Apple requires HTTPS for all network requests. Exceptions:

**Development (Simulator Only)**:
```xml
<!-- Info.plist -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

**Production**: HTTPS required, no exceptions

### TLS Requirements

- **Minimum**: TLS 1.2
- **Recommended**: TLS 1.3
- **Certificate**: Valid, not self-signed
- **Domains**: All API domains must support HTTPS

---

## Caching Recommendations for iOS

### URLSession Configuration

```swift
let configuration = URLSessionConfiguration.default
configuration.requestCachePolicy = .returnCacheDataElseLoad
configuration.urlCache = URLCache(
  memoryCapacity: 10 * 1024 * 1024,  // 10 MB
  diskCapacity: 50 * 1024 * 1024     // 50 MB
)
```

### Custom Cache Manager

```swift
class StatsCache {
  private let maxAge: TimeInterval = 6 * 60 * 60  // 6 hours
  private let userDefaults = UserDefaults.standard
  
  func getCached<T: Codable>(for key: String) -> T? {
    guard let data = userDefaults.data(forKey: key),
          let timestamp = userDefaults.object(forKey: "\(key)_timestamp") as? Date,
          Date().timeIntervalSince(timestamp) < maxAge,
          let object = try? JSONDecoder().decode(T.self, from: data) else {
      return nil
    }
    return object
  }
  
  func cache<T: Codable>(_ object: T, for key: String) {
    if let data = try? JSONEncoder().encode(object) {
      userDefaults.set(data, forKey: key)
      userDefaults.set(Date(), forKey: "\(key)_timestamp")
    }
  }
}
```

---

## Complete iOS API Client Example

```swift
import Foundation

enum APIError: Error {
  case invalidURL
  case networkError(Error)
  case invalidResponse
  case decodingError(Error)
  case serverError(String)
}

class StatsAPI {
  private let baseURL: String
  private let session: URLSession
  private let cache = StatsCache()
  
  init(baseURL: String = "http://localhost:4000") {
    self.baseURL = baseURL
    
    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 30
    config.timeoutIntervalForResource = 300
    self.session = URLSession(configuration: config)
  }
  
  // MARK: - Health Check
  
  func checkHealth() async throws -> HealthResponse {
    try await get(path: "/api/health")
  }
  
  // MARK: - Stats
  
  func fetchOffenseStats(useCache: Bool = true) async throws -> StatsResponse {
    // Check cache first
    if useCache, let cached: StatsResponse = cache.getCached(for: "offense") {
      return cached
    }
    
    // Fetch fresh data
    let response: StatsResponse = try await get(path: "/api/nfl-2025/offense")
    
    // Cache if not stale
    if response.stale != true {
      cache.cache(response, for: "offense")
    }
    
    return response
  }
  
  func fetchDefenseStats(useCache: Bool = true) async throws -> StatsResponse {
    // Check cache first
    if useCache, let cached: StatsResponse = cache.getCached(for: "defense") {
      return cached
    }
    
    // Fetch fresh data
    let response: StatsResponse = try await get(path: "/api/nfl-2025/defense")
    
    // Cache if not stale
    if response.stale != true {
      cache.cache(response, for: "defense")
    }
    
    return response
  }
  
  // MARK: - Generic GET
  
  private func get<T: Codable>(path: String) async throws -> T {
    guard let url = URL(string: baseURL + path) else {
      throw APIError.invalidURL
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    
    let (data, response) = try await session.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse else {
      throw APIError.invalidResponse
    }
    
    // Log response headers
    if let requestID = httpResponse.value(forHTTPHeaderField: "X-Request-ID") {
      print("Request ID: \(requestID)")
    }
    if let cache = httpResponse.value(forHTTPHeaderField: "X-Cache") {
      print("Cache status: \(cache)")
    }
    
    // Handle errors
    if httpResponse.statusCode >= 400 {
      if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
        throw APIError.serverError(errorResponse.message)
      }
      throw APIError.serverError("HTTP \(httpResponse.statusCode)")
    }
    
    // Decode response
    do {
      return try JSONDecoder().decode(T.self, from: data)
    } catch {
      throw APIError.decodingError(error)
    }
  }
}

// MARK: - Response Models

struct ErrorResponse: Codable {
  let error: String
  let message: String
  let requestId: String?
  let timestamp: String
}

struct HealthResponse: Codable {
  let ok: Bool
  let version: String
  let timestamp: String
  let uptime: Int
  let endpoints: EndpointStatus
  let environment: String
}

struct EndpointStatus: Codable {
  let offense: String
  let defense: String
}

struct StatsResponse: Codable {
  let season: Int
  let type: String
  let updatedAt: String
  let rows: [TeamStats]
  let stale: Bool?
  let error: String?
}

struct TeamStats: Codable {
  let team: String
  let g: String
  let points: String
  let totalYards: String
  // ... all other fields with CodingKeys
}

// MARK: - Cache Manager

class StatsCache {
  private let maxAge: TimeInterval = 6 * 60 * 60  // 6 hours
  private let userDefaults = UserDefaults.standard
  
  func getCached<T: Codable>(for key: String) -> T? {
    guard let data = userDefaults.data(forKey: key),
          let timestamp = userDefaults.object(forKey: "\(key)_timestamp") as? Date,
          Date().timeIntervalSince(timestamp) < maxAge,
          let object = try? JSONDecoder().decode(T.self, from: data) else {
      return nil
    }
    return object
  }
  
  func cache<T: Codable>(_ object: T, for key: String) {
    if let data = try? JSONEncoder().encode(object) {
      userDefaults.set(data, forKey: key)
      userDefaults.set(Date(), forKey: "\(key)_timestamp")
    }
  }
  
  func clearCache() {
    let keys = ["offense", "defense"]
    keys.forEach { key in
      userDefaults.removeObject(forKey: key)
      userDefaults.removeObject(forKey: "\(key)_timestamp")
    }
  }
}
```

---

## Usage in SwiftUI View

```swift
import SwiftUI

@MainActor
class StatsViewModel: ObservableObject {
  @Published var offenseStats: [TeamStats] = []
  @Published var defenseStats: [TeamStats] = []
  @Published var isLoading = false
  @Published var error: String?
  @Published var isStale = false
  
  private let api = StatsAPI(baseURL: "http://localhost:4000")
  
  func loadStats() async {
    isLoading = true
    error = nil
    
    do {
      // Check health first
      let health = try await api.checkHealth()
      print("Backend healthy: \(health.ok)")
      
      // Fetch both offense and defense
      async let offense = api.fetchOffenseStats()
      async let defense = api.fetchDefenseStats()
      
      let (offenseResponse, defenseResponse) = try await (offense, defense)
      
      offenseStats = offenseResponse.rows
      defenseStats = defenseResponse.rows
      isStale = offenseResponse.stale == true || defenseResponse.stale == true
      
    } catch {
      self.error = error.localizedDescription
    }
    
    isLoading = false
  }
}

struct CompareView: View {
  @StateObject private var viewModel = StatsViewModel()
  
  var body: some View {
    Group {
      if viewModel.isLoading {
        ProgressView("Loading stats...")
      } else if let error = viewModel.error {
        ErrorView(message: error) {
          Task { await viewModel.loadStats() }
        }
      } else {
        StatsListView(
          offenseStats: viewModel.offenseStats,
          defenseStats: viewModel.defenseStats,
          isStale: viewModel.isStale
        )
      }
    }
    .task {
      await viewModel.loadStats()
    }
  }
}
```

---

## Testing

### Manual Testing (curl)

```bash
# Health check
curl http://localhost:4000/api/health | jq

# Offense stats
curl http://localhost:4000/api/nfl-2025/offense | jq '.rows[0]'

# Defense stats
curl http://localhost:4000/api/nfl-2025/defense | jq '.rows[0]'

# Check cache headers
curl -I http://localhost:4000/api/nfl-2025/offense
```

### iOS Simulator Testing

1. Start Next.js server: `npm run dev`
2. Server runs on `http://localhost:4000`
3. iOS Simulator can connect to localhost directly
4. Use Info.plist exception for local networking

### Physical Device Testing

1. **Option A**: Deploy to HTTPS (Vercel)
2. **Option B**: Use ngrok for local HTTPS tunnel
   ```bash
   ngrok http 3000
   # Use https://xyz.ngrok.io as base URL
   ```

---

## Deployment Checklist

- [ ] Create `/api/health` endpoint ✅ DONE
- [ ] Test all endpoints locally with curl
- [ ] Deploy to HTTPS production (Vercel/Railway)
- [ ] Update iOS Config.xcconfig with production URL
- [ ] Test from iOS Simulator
- [ ] Test from physical device
- [ ] Verify ATS compliance
- [ ] Monitor response times
- [ ] Document any API changes in this file

---

## API Versioning (Future)

Not implemented yet, but recommended structure:

```
/api/v1/health
/api/v1/nfl-2025/offense
/api/v1/nfl-2025/defense
```

This allows breaking changes in v2 while keeping v1 stable.

---

## Support

**Questions**: See `docs/devnotes/2025-10-10-api-audit.md`

**Issues**: Check server logs with `npm run dev` (verbose logging enabled)

**Updates**: API structure unlikely to change, but check `CHANGELOG.md` for updates

---

**Last Updated**: 2025-10-10  
**Status**: Production ready (pending HTTPS deployment)


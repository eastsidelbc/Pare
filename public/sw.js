// Pare NFL PWA Service Worker
// Cache strategies: Stale-While-Revalidate for API, Cache First for assets

const CACHE_NAME = 'pare-nfl-v1.0.5';
const STATIC_CACHE = 'pare-static-v1.0.5';
const API_CACHE = 'pare-api-v1.0.5';
const IMAGES_CACHE = 'pare-images-v1.0.5';

// Cache expiration times
const CACHE_EXPIRATION = {
  API_FRESH: 30 * 60 * 1000, // 30 minutes for fresh data
  API_STALE: 6 * 60 * 60 * 1000, // 6 hours before considering stale
  IMAGES: 7 * 24 * 60 * 60 * 1000, // 7 days for team logos
  STATIC: 24 * 60 * 60 * 1000, // 24 hours for static assets
};

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/compare',
  '/icon-192.png',
  '/manifest.json',
  // Add core CSS/JS that Next.js generates
  '/_next/static/css/',
  '/_next/static/chunks/',
];

// Install: Cache critical static assets
self.addEventListener('install', (event) => {
  console.log('🔧 [SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 [SW] Caching static assets');
        // Only cache the essential files, let Next.js handle the rest
        return cache.addAll([
          '/',
          '/compare',
          '/icon-192.png',
          '/manifest.json'
        ]);
      })
      .then(() => {
        console.log('✅ [SW] Static assets cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('❌ [SW] Failed to cache static assets:', error);
      })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 [SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old versions
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE &&
                cacheName !== IMAGES_CACHE) {
              console.log('🗑️ [SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ [SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch: Smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Strategy 1: NFL Stats API - Smart Stale While Revalidate  
  if (url.pathname.startsWith('/api/nfl-')) {
    event.respondWith(smartNflStatsCache(request));
    return;
  }

  // Strategy 1B: Other API Routes - Standard Stale While Revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // Strategy 2A: NFL Team Logos - Long Term Cache
  if (url.pathname.includes('/images/nfl-logos/')) {
    event.respondWith(longTermImageCache(request));
    return;
  }

  // Strategy 2B: Other Static Assets - Cache First
  if (url.pathname.includes('/_next/static/') || 
      url.pathname.includes('/images/') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy 3: HTML Pages - Network First with Offline Fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Default: Network only for everything else
  event.respondWith(fetch(request));
});

// Helper: Check if cached response is fresh
function isCacheFresh(response, maxAge) {
  if (!response) return false;
  
  const cachedDate = response.headers.get('sw-cached-date');
  if (!cachedDate) return false;
  
  const age = Date.now() - new Date(cachedDate).getTime();
  return age < maxAge;
}

// Helper: Add timestamp to cached response
function addCacheTimestamp(response) {
  const clonedResponse = response.clone();
  const headers = new Headers(clonedResponse.headers);
  headers.set('sw-cached-date', new Date().toISOString());
  headers.set('sw-cache-status', 'fresh');
  
  return new Response(clonedResponse.body, {
    status: clonedResponse.status,
    statusText: clonedResponse.statusText,
    headers: headers
  });
}

// Smart NFL Stats Cache: Advanced caching with freshness indicators
async function smartNflStatsCache(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Check if we have cached data and its freshness
  const isFresh = isCacheFresh(cachedResponse, CACHE_EXPIRATION.API_FRESH);
  const isStale = cachedResponse && !isCacheFresh(cachedResponse, CACHE_EXPIRATION.API_STALE);
  
  console.log(`🏈 [NFL-CACHE] ${request.url}:`, {
    hasCached: !!cachedResponse,
    isFresh,
    isStale: isStale && !isFresh,
    strategy: isFresh ? 'serve-cached' : 'fetch-update'
  });
  
  // If data is fresh, serve immediately
  if (isFresh) {
    console.log('⚡ [NFL-CACHE] Serving fresh cached data');
    return cachedResponse;
  }
  
  // Try to fetch fresh data
  try {
    console.log('🌐 [NFL-CACHE] Fetching fresh NFL stats...');
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the fresh response with timestamp
      const responseToCache = addCacheTimestamp(networkResponse);
      cache.put(request, responseToCache.clone());
      console.log('✅ [NFL-CACHE] Fresh data cached successfully');
      return networkResponse;
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
    
  } catch (error) {
    console.log('❌ [NFL-CACHE] Network failed:', error.message);
    
    // If we have stale cached data, return it with a stale indicator
    if (cachedResponse && !isStale) {
      console.log('📦 [NFL-CACHE] Serving stale cached data');
      const staleResponse = cachedResponse.clone();
      const headers = new Headers(staleResponse.headers);
      headers.set('sw-cache-status', 'stale');
      
      return new Response(staleResponse.body, {
        status: staleResponse.status,
        statusText: staleResponse.statusText,
        headers: headers
      });
    }
    
    // No cached data available, return error
    console.log('🚫 [NFL-CACHE] No cached data available');
    return new Response(
      JSON.stringify({
        error: 'NFL stats unavailable offline',
        message: 'Please connect to the internet to load fresh data',
        cached: false
      }),
      {
        status: 503,
        headers: { 
          'Content-Type': 'application/json',
          'sw-cache-status': 'unavailable'
        }
      }
    );
  }
}

// Long Term Image Cache: For NFL team logos that rarely change
async function longTermImageCache(request) {
  const cache = await caches.open(IMAGES_CACHE);
  const cachedResponse = await cache.match(request);
  
  // If we have it cached and it's not expired, serve it
  if (cachedResponse && isCacheFresh(cachedResponse, CACHE_EXPIRATION.IMAGES)) {
    console.log('🖼️ [IMAGE-CACHE] Serving cached team logo');
    return cachedResponse;
  }
  
  // Try to fetch and cache
  try {
    console.log('🌐 [IMAGE-CACHE] Fetching team logo...');
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = addCacheTimestamp(networkResponse);
      cache.put(request, responseToCache.clone());
      console.log('✅ [IMAGE-CACHE] Team logo cached');
      return networkResponse;
    }
    
    throw new Error(`Image fetch failed: ${networkResponse.status}`);
    
  } catch (error) {
    console.log('❌ [IMAGE-CACHE] Network failed for image:', error.message);
    
    // Return cached version even if expired
    if (cachedResponse) {
      console.log('📦 [IMAGE-CACHE] Serving expired cached image');
      return cachedResponse;
    }
    
    // Return a placeholder or let the request fail
    throw error;
  }
}

// Stale While Revalidate: Return cached version immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch fresh data in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        // Update cache with fresh data
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // Network failed, but we might have cached data
      console.log('🌐 [SW] Network failed for:', request.url);
    });

  // Return cached data immediately if available, otherwise wait for network
  if (cachedResponse) {
    console.log('⚡ [SW] Serving from cache (updating in background):', request.url);
    fetchPromise; // Don't await - let it update in background
    return cachedResponse;
  }

  console.log('🌐 [SW] No cache, waiting for network:', request.url);
  return fetchPromise;
}

// Cache First: Check cache first, fallback to network
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('📦 [SW] Serving static asset from cache:', request.url);
    return cachedResponse;
  }

  console.log('🌐 [SW] Fetching static asset:', request.url);
  const response = await fetch(request);
  
  if (response.ok) {
    cache.put(request, response.clone());
  }
  
  return response;
}

// Network First with Fallback: Try network, fallback to cache, then offline page
async function networkFirstWithFallback(request) {
  try {
    console.log('🌐 [SW] Trying network for HTML:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful HTML responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('📦 [SW] Network failed, checking cache for:', request.url);
    
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    // Ultimate fallback: offline page or basic response
    console.log('🔌 [SW] No cache available, showing offline fallback');
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pare NFL - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui; 
              text-align: center; 
              padding: 2rem; 
              background: #0f172a; 
              color: white; 
            }
            h1 { color: #8b5cf6; }
          </style>
        </head>
        <body>
          <h1>📱 Pare NFL</h1>
          <p>You're offline, but your app is still here!</p>
          <p>Reconnect to the internet to load fresh NFL stats.</p>
          <button onclick="window.location.reload()">🔄 Try Again</button>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Background Sync for future features
self.addEventListener('sync', (event) => {
  console.log('🔄 [SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'nfl-stats-sync') {
    event.waitUntil(syncNflStats());
  }
});

async function syncNflStats() {
  console.log('📊 [SW] Syncing NFL stats in background...');
  // Future: Pre-fetch updated stats when connection returns
}

// Handle navigation requests (for PWA deep links)
self.addEventListener('message', (event) => {
  console.log('📱 [SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⚡ [SW] Skipping waiting, activating new version');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION', 
      version: 'v1.0.5',
      caches: [CACHE_NAME, STATIC_CACHE, API_CACHE, IMAGES_CACHE]
    });
  }
});

// Navigation handling for SPAs in PWA mode
self.addEventListener('navigate', (event) => {
  console.log('🧭 [SW] Navigation request:', event.request.url);
  
  // For same-origin navigation, always serve the app shell
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch('/compare').catch(() => {
        return caches.match('/compare');
      })
    );
  }
});

// Push notifications for future features
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('🔔 [SW] Push notification received:', data);
    
    // Future: Show notifications for game updates, stat changes, etc.
  }
});

console.log('🏈 Pare NFL Service Worker loaded successfully');

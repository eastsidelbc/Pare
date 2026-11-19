import type { NextConfig } from "next";
import { execSync } from "node:child_process";

// Bake the deployed git commit + build time into the bundle so /api/health can
// report exactly what's running (one curl from anywhere). Best-effort — falls
// back to 'unknown' if git isn't available at build time.
const gitSha = (() => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
})();
const buildTime = new Date().toISOString();

// Content-Security-Policy: the browser may load code, styles, images and data from pare.gg only
// (fonts are self-hosted by next/font; ESPN/Sleeper are called server-side). Shipped as
// Report-Only first (logs violations, blocks nothing) → enforce once the console is clean.
// 'unsafe-inline' for scripts is deliberate: nonces force every page to render per request
// (no ISR), and hash-based SRI is webpack-only (we build with Turbopack). Next's own inline RSC
// scripts plus our 3 fixed inline scripts in app/layout.tsx need it. No user HTML is ever
// rendered, and everything else is locked down. 'unsafe-eval' is dev-only (React dev tooling).
const isDev = process.env.NODE_ENV === 'development';
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws:' : ''}`,
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  // Explicit: never ship browser source maps in production.
  productionBrowserSourceMaps: false,

  env: {
    GIT_SHA: gitSha,
    BUILD_TIME: buildTime,
  },

  // PWA Optimizations
  async headers() {
    return [
      {
        // Security headers on every route (security hardening phase 3,
        // docs/devnotes/2026-11-19-security-phase3-headers.md).
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy-Report-Only', value: CSP },
          // HSTS: browsers only ever use HTTPS for pare.gg (1 year). `preload` needs Kobe's OK.
          ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' }, // + CSP frame-ancestors 'none'; the iOS app loads pare.gg top-level
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate', // Always check for updates
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/', // Allow service worker to control entire site
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate', // Always re-check so start_url changes propagate
          },
        ],
      },
      {
        source: '/icon-192.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // Cache icons for 1 year
          },
        ],
      },
    ];
  },
  
  // Optimize for production builds
  experimental: {
    optimizeCss: true, // Optimize CSS for PWA
  },
  
  // Improve performance for mobile
  compress: true,
  poweredByHeader: false,
  
  // Ensure static files are properly served
  trailingSlash: false,
};

export default nextConfig;

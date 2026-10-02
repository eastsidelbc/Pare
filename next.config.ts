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

const nextConfig: NextConfig = {
  env: {
    GIT_SHA: gitSha,
    BUILD_TIME: buildTime,
  },

  // PWA Optimizations
  async headers() {
    return [
      {
        // Baseline security headers on every route (defense-in-depth). HSTS + a
        // tuned Content-Security-Policy are added at the Cloudflare edge / later.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA Optimizations
  async headers() {
    return [
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
            value: 'public, max-age=31536000, immutable', // Cache manifest for 1 year
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

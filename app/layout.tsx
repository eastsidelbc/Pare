import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pare: NFL Team Comparison",
  description: "Professional NFL team comparison with theScore-style visualizations and real-time 2025 stats",
  applicationName: "Pare NFL",
  keywords: ["NFL", "sports", "team comparison", "statistics", "football"],
  authors: [{ name: "Pare" }],
  creator: "Pare",
  publisher: "Pare",
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pare NFL",
    startupImage: [
      "/icon-192.png",
    ],
  },
  openGraph: {
    type: "website",
    siteName: "Pare NFL",
    title: "Pare: NFL Team Comparison",
    description: "Professional NFL team comparison with theScore-style visualizations",
    images: [
      {
        url: "/icon-192.png",
        width: 192,
        height: 192,
        alt: "Pare NFL App",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Pare: NFL Team Comparison", 
    description: "Professional NFL team comparison with theScore-style visualizations",
    images: ["/icon-192.png"],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a',
  colorScheme: 'dark',
  userScalable: false,
  maximumScale: 1,
  minimumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Gate SW registration using public env var evaluated at build time
  const enableSW = process.env.NEXT_PUBLIC_ENABLE_SW === 'true';
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pare NFL" />
        <script dangerouslySetInnerHTML={{
          __html: `
            // Register Service Worker for PWA functionality (gated by env flag)
            try {
              var ENABLE_SW = ${enableSW ? 'true' : 'false'};
              if ('serviceWorker' in navigator && ENABLE_SW) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                      console.log('✅ [PWA] Service Worker registered successfully:', registration.scope);
                      registration.addEventListener('updatefound', () => {
                        console.log('🔄 [PWA] Service Worker update found');
                        const newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              console.log('📱 [PWA] New app version available - restart to update');
                            }
                          });
                        }
                      });
                    })
                    .catch((error) => {
                      console.log('❌ [PWA] Service Worker registration failed:', error);
                    });
                });
              } else {
                console.log('⚠️ [PWA] Service Worker disabled or not supported');
              }
            } catch (e) {
              console.log('⚠️ [PWA] SW registration script error:', e);
            }
          `
        }} />
      </head>
      <body className="antialiased overflow-x-hidden">
        {/* Phase 1 shell: pinned rail on desktop, drawer on mobile */}
        {/* eslint-disable-next-line react/no-unknown-property */}
        {/* @ts-expect-error Server Component wrapping Client Shell is supported */}
        {React.createElement(require('../components/SiteLayoutShell').default, null, children)}
      </body>
    </html>
  );
}

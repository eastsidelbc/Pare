import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ComparisonsProvider } from "@/components/ComparisonsProvider";
import { NflStatsProvider } from "@/components/NflStatsProvider";
import BottomNav from "@/components/BottomNav";
import { ScheduleProvider } from "@/components/schedule/ScheduleProvider";
import { FavoritesProvider } from "@/components/FavoritesProvider";
import FavoritesOverlays from "@/components/favorites/FavoritesOverlays";
import { getCurrentWeekInfo, getCurrentWeekMatchups, getMatchupsForWeek, MIN_WEEK } from "@/lib/schedule";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pare.gg"),
  title: "Pare: NFL Team Comparison",
  description: "Professional NFL team comparison with theScore-style visualizations and real-time NFL stats",
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
  themeColor: '#0a0e1a',
  colorScheme: 'dark',
  userScalable: false,
  maximumScale: 1,
  minimumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Gate SW registration using public env var evaluated at build time
  const enableSW = process.env.NEXT_PUBLIC_ENABLE_SW === 'true';

  // Fetch current week + its games server-side in parallel, then fetch the
  // previous week (also server-side, ISR-cached). Seeding both into
  // ScheduleProvider means the user can scroll UP immediately on first load —
  // week N-1 is already above them, no "scroll down first" workaround needed.
  const [{ week: currentNflWeek }, initialMatchups] = await Promise.all([
    getCurrentWeekInfo(),
    getCurrentWeekMatchups(),
  ]);
  const initialWeek = initialMatchups[0]?.week ?? currentNflWeek;

  // Pre-load the previous week so it's ready above the current week.
  // Skip at week 1 (nothing before it — hard stop).
  const prevWeekMatchups = initialWeek > MIN_WEEK
    ? await getMatchupsForWeek(initialWeek - 1)
    : [];

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pare NFL" />
        {/* Authoritative viewport height for standalone PWAs: iOS can report
            100dvh taller than the real usable area, clipping the bottom of the
            fixed app shell. Drive it from window.innerHeight instead. */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function () {
              var setH = function () {
                document.documentElement.style.setProperty('--app-h', window.innerHeight + 'px');
              };
              setH();
              window.addEventListener('resize', setH);
              window.addEventListener('orientationchange', setH);
            })();
          `,
        }} />
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
      <body className="font-sans antialiased overflow-x-hidden">
        <ComparisonsProvider>
          <NflStatsProvider>
          <ScheduleProvider
            initialWeek={initialWeek}
            initialMatchups={initialMatchups}
            prevWeekMatchups={prevWeekMatchups}
            currentNflWeek={currentNflWeek}
          >
            <FavoritesProvider>
              {children}
              {/* Single persistent footer — rendered once, outside every route and
                  outside the compare swipe container, so it never re-mounts. */}
              <BottomNav />
              {/* Your-teams sheet, Standings quick menu, first launch, toast. */}
              <FavoritesOverlays />
            </FavoritesProvider>
          </ScheduleProvider>
          </NflStatsProvider>
        </ComparisonsProvider>
      </body>
    </html>
  );
}

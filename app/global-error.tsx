'use client';

/**
 * Global error boundary — catches errors in the root layout itself. This REPLACES
 * the root layout (and its globals.css), so it must render its own <html>/<body>
 * and cannot use CSS design tokens — colors are hard-coded to the dark theme.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: 24,
          textAlign: 'center',
          background: '#0a0e1a',
          color: '#f1f5f9',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#d4a843' }}>
          Something went wrong
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: '#94a3b8', maxWidth: 340 }}>
          Pare couldn&apos;t load. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: 4,
            fontSize: 13,
            fontWeight: 700,
            color: '#0a0e1a',
            background: '#d4a843',
            border: 'none',
            borderRadius: 10,
            padding: '10px 20px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}

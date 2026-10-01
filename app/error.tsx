'use client';

/**
 * Route-level error boundary (App Router). Renders in place of a page's content
 * when a Client/Server Component throws, inside the root layout (nav still shows).
 * We intentionally do NOT surface the error message/stack to the user.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div
      style={{
        minHeight: 'var(--app-h, 100dvh)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 24,
        textAlign: 'center',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>
        Something went wrong
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--subtext)', maxWidth: 340 }}>
        Pare hit an unexpected error loading this view. It&apos;s usually temporary.
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 4,
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--bg)',
          background: 'var(--gold)',
          borderRadius: 'var(--radius-md, 10px)',
          padding: '10px 20px',
        }}
      >
        Try again
      </button>
    </div>
  );
}

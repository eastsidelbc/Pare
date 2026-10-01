import Link from 'next/link';

/** Branded 404 (App Router). Renders inside the root layout. */
export default function NotFound() {
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
      <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-1px', color: 'var(--gold)' }}>404</div>
      <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--subtext)', maxWidth: 340 }}>
        That page doesn&apos;t exist. The matchup may have moved.
      </p>
      <Link
        href="/"
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
        Back to schedule
      </Link>
    </div>
  );
}

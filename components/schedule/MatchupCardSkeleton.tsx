/**
 * MatchupCardSkeleton — shimmer placeholder matching MatchupCard's footprint
 * (Frame Row: 1.5px neutral frame, 64px row, abbr + label on each side, center
 * status). Prevents layout shift while the schedule resolves.
 */

'use client';

function Line({ w, h = 10 }: { w: number; h?: number }) {
  return <div className="skeleton rounded-sm" style={{ width: w, height: h }} />;
}

function Side({ align }: { align: 'left' | 'right' }) {
  return (
    <div className={`flex flex-1 flex-col gap-1.5 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <Line w={44} h={22} />
      <Line w={58} h={9} />
    </div>
  );
}

export default function MatchupCardSkeleton() {
  return (
    <div style={{ padding: 1.5, borderRadius: 'var(--radius-lg)', background: 'var(--frame-mid)' }}>
      <div
        className="flex items-center gap-3"
        style={{
          minHeight: 64,
          padding: '9px 12px',
          borderRadius: 'calc(var(--radius-lg) - 1.5px)',
          background: 'linear-gradient(90deg, var(--card-deep-a), var(--card-deep-mid) 50%, var(--card-deep-b))',
        }}
      >
        <Side align="left" />
        <div className="flex flex-none flex-col items-center gap-1.5" style={{ width: 76 }}>
          <Line w={44} h={11} />
          <Line w={26} h={8} />
        </div>
        <Side align="right" />
      </div>
    </div>
  );
}

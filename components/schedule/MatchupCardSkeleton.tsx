/**
 * MatchupCardSkeleton — shimmer placeholder matching MatchupCard's footprint.
 * Prevents layout shift while the schedule resolves.
 */

'use client';

function Circle() {
  return <div className="skeleton flex-none rounded-lg" style={{ width: 38, height: 38 }} />;
}

function Line({ w, h = 10 }: { w: number; h?: number }) {
  return <div className="skeleton rounded" style={{ width: w, height: h }} />;
}

export default function MatchupCardSkeleton() {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 14px',
      }}
    >
      <div className="flex flex-1 items-center gap-2.5">
        <Circle />
        <div className="space-y-1.5">
          <Line w={34} h={12} />
          <Line w={48} />
        </div>
      </div>

      <div className="flex flex-none flex-col items-center gap-1.5" style={{ minWidth: 56 }}>
        <Line w={24} />
        <Line w={36} />
      </div>

      <div className="flex flex-1 flex-row-reverse items-center gap-2.5">
        <Circle />
        <div className="flex flex-col items-end space-y-1.5">
          <Line w={34} h={12} />
          <Line w={48} />
        </div>
      </div>
    </div>
  );
}

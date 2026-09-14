/**
 * Mobile Bottom Bar
 * 
 * Simple Pare-branded bottom tabs
 * LAYOUT: theScore compact structure
 * STYLE: Pare visual design (purple for active, slate for inactive)
 */

'use client';

export default function MobileBottomBar() {
  return (
    <div 
      className="flex-none z-10 border-t"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--surface)',
        borderColor: 'var(--border)'
      }}
    >
      <div className="h-16 px-4 flex justify-around items-center">
        {/* Tab 1: Stats (placeholder — inactive) */}
        <button className="flex flex-col items-center gap-1 touch-optimized active:opacity-60">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-xs"
            style={{ background: 'rgba(107,114,128,0.15)' }}
          >
            📊
          </div>
          <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--muted)' }}>Stats</span>
        </button>
        
        {/* Tab 2: Compare (active — gold) */}
        <button className="flex flex-col items-center gap-1 touch-optimized">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-xs"
            style={{ background: 'rgba(245,200,66,0.18)' }}
          >
            ⚖️
          </div>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gold)' }}>Compare</span>
        </button>
        
        {/* Tab 3: Settings (placeholder — inactive) */}
        <button className="flex flex-col items-center gap-1 touch-optimized active:opacity-60">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-xs"
            style={{ background: 'rgba(107,114,128,0.15)' }}
          >
            ⚙️
          </div>
          <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--muted)' }}>Settings</span>
        </button>
      </div>
    </div>
  );
}


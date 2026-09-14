/**
 * Mobile Top Bar
 * 
 * Simple Pare-branded top bar
 * LAYOUT: theScore compact structure
 * STYLE: Pare visual design (purple accents, steel-blue bg)
 */

'use client';

export default function MobileTopBar() {
  return (
    <div 
      className="flex-none z-10 border-b"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        background: 'var(--surface)',
        borderColor: 'var(--border)'
      }}
    >
      <div className="h-14 px-4 flex items-center justify-between">
        {/* Left: Pare Branding */}
        <h1 className="font-black tracking-tight" style={{ fontSize: '20px', color: 'var(--text)' }}>
          Pare
          <span className="ml-1.5 font-bold" style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}>NFL</span>
        </h1>
        
        {/* Right: Season Info */}
        <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--subtext)' }}>
          2025 Season
        </div>
      </div>
    </div>
  );
}


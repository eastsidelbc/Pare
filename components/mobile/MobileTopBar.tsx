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
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(10px)',
        borderColor: 'rgba(139, 92, 246, 0.2)'
      }}
    >
      <div className="h-14 px-4 flex items-center justify-between">
        {/* Left: Pare Branding */}
        <h1 className="text-lg font-bold">
          <span className="text-white">Pare</span>
          {' '}
          <span className="text-purple-400">NFL</span>
        </h1>
        
        {/* Right: Season Info */}
        <div className="text-sm text-slate-400">
          2025 Season
        </div>
      </div>
    </div>
  );
}


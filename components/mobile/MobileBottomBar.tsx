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
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div 
        className="h-16 px-4 flex justify-around items-center border-t"
        style={{
          // PARE STYLING
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          borderColor: 'rgba(139, 92, 246, 0.2)' // Purple border
        }}
      >
        {/* Tab 1: Stats (placeholder) */}
        <button className="flex flex-col items-center gap-1 transition-opacity active:opacity-50">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(100, 116, 139, 0.3)' }}
          >
            📊
          </div>
          <span className="text-xs text-slate-400">Stats</span>
        </button>
        
        {/* Tab 2: Compare (active) */}
        <button className="flex flex-col items-center gap-1">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(139, 92, 246, 0.5)' }} // Purple active
          >
            ⚖️
          </div>
          <span className="text-xs font-semibold text-purple-400">Compare</span>
        </button>
        
        {/* Tab 3: Settings (placeholder) */}
        <button className="flex flex-col items-center gap-1 transition-opacity active:opacity-50">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(100, 116, 139, 0.3)' }}
          >
            ⚙️
          </div>
          <span className="text-xs text-slate-400">Settings</span>
        </button>
      </div>
    </div>
  );
}


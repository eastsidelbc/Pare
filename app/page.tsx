import { APP_CONSTANTS } from '@/config/constants';

export default function Home() {
  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#1e293b] text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-6xl space-y-10">
        <h1 className="text-center text-5xl md:text-6xl font-extrabold tracking-tight font-sans text-slate-100 drop-shadow-[0_1px_8px_rgba(255,255,255,0.05)]">
          Pare: <span className="text-blue-400">Sports Stats Platform</span>
        </h1>
        
        <div className="text-center space-y-6">
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Professional sports statistics comparison platform with real-time data from authoritative sources.
          </p>
          
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-2xl border border-blue-400/20 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-blue-400 mb-4">NFL Team Comparison</h2>
              <div className="space-y-4">
                <p className="text-slate-300">
                  Comprehensive team analysis with dual-section offense and defense comparison.
                </p>
                <a 
                  href="/compare" 
                  className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Compare Teams →
                </a>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-2xl border border-green-400/20 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-green-400 mb-4">API Endpoints</h2>
              <div className="space-y-3 text-left">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <code className="text-green-400">GET {APP_CONSTANTS.API.ENDPOINTS.OFFENSE}</code>
                  <p className="text-sm text-slate-400 mt-1">NFL team offense statistics with rankings</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <code className="text-green-400">GET {APP_CONSTANTS.API.ENDPOINTS.DEFENSE}</code>
                  <p className="text-sm text-slate-400 mt-1">NFL team defense statistics with rankings</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-2xl border border-purple-400/20 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-purple-400 mb-4">Features</h2>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div>
                  <h3 className="font-semibold text-white">Real-time Data</h3>
                  <p className="text-sm text-slate-400">Live scraping from Pro Football Reference</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Smart Caching</h3>
                  <p className="text-sm text-slate-400">6-hour cache with stale data fallbacks</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">TypeScript API</h3>
                  <p className="text-sm text-slate-400">Fully typed responses and error handling</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">PM2 Optimized</h3>
                  <p className="text-sm text-slate-400">Built for 24/7 self-hosted deployment</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

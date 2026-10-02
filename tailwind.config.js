/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Legacy — these point at vars NOT defined in globals.css; kept only to avoid breakage.
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Design-system tokens. Source of truth = app/globals.css :root. Prefer these:
        // bg-bg / bg-surface / bg-card, border-border, text-text / text-subtext / text-muted,
        // bg-gold, bg-green, bg-fire, etc. (Additive — existing palette classes still work.)
        bg: "var(--bg)",
        surface: "var(--surface)",
        card: "var(--card)",
        border: "var(--border)",
        gold: "var(--gold)",
        "gold-bright": "var(--gold-bright)",
        green: "var(--green)",
        fire: "var(--fire)",
        red: "var(--red)",
        blue: "var(--blue)",
        text: "var(--text)",
        subtext: "var(--subtext)",
        muted: "var(--muted)",
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      height: {
        'screen-dynamic': '100dvh',
        'screen-small': '100svh',
        'screen-large': '100lvh',
      },
      minHeight: {
        'screen-dynamic': '100dvh',
        'screen-small': '100svh',
        'screen-large': '100lvh',
      },
      boxShadow: {
        'premium': '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'premium-lg': '0 35px 80px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'bar-3d': 'inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 2px 4px rgba(0, 0, 0, 0.2)',
        'panel-floating': '0 20px 40px -8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)',
        // Design-system elevation tokens (source: globals.css) → shadow-card / shadow-pop.
        'card': 'var(--shadow-card)',
        'pop': 'var(--shadow-pop)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'premium-green': 'linear-gradient(135deg, #10b981, #34d399, #6ee7b7)',
        'premium-blue': 'linear-gradient(135deg, #3b82f6, #60a5fa, #93c5fd)',
        'glass-panel': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      },
      backdropBlur: {
        'premium': '32px',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'bar-load': 'bar-load 1s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'bar-load': {
          '0%': { width: '0%', opacity: '0' },
          '100%': { width: 'var(--target-width)', opacity: '1' },
        }
      }
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- this is a CommonJS config file; require() is the correct way to load the plugin
    require('@tailwindcss/typography'),
    // NOTE: .touch-optimized and .focus-ring were moved to @utility blocks in
    // app/globals.css (Tailwind v4 canonical form) — no addUtilities needed here.
  ],
};

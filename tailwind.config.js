/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        glass: 'rgba(255,255,255,0.05)',
        // ── Brand accent remapped to OCEAN BLUE ──────────────────────────────
        // The app historically used indigo/violet/purple as the brand color.
        // These palettes are overridden so every existing `*-indigo-*`,
        // `*-violet-*` and `*-purple-*` utility renders ocean blue instead.
        indigo: {
          50:  '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
          400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
          800: '#075985', 900: '#0c4a6e', 950: '#082f49',
        },
        violet: {
          50:  '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
        purple: {
          50:  '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
      },
      backgroundImage: {
        'app-bg': 'var(--c-app-bg)',
        'sidebar-bg': 'var(--c-sidebar-bg)',
        'card-glass': 'var(--c-card-bg)',
        'btn-primary': 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
        'btn-danger': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      },
      boxShadow: {
        'glow-indigo': '0 0 30px rgba(14,165,233,0.25)',
        'glow-violet': '0 0 30px rgba(37,99,235,0.25)',
        'glow-cyan': '0 0 20px rgba(34,211,238,0.2)',
        'glow-rose': '0 0 20px rgba(239,68,68,0.25)',
        'glow-emerald': '0 0 20px rgba(52,211,153,0.2)',
        'glass': '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-lg': '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'count-up': 'countUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: 0, transform: 'translateX(20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(14,165,233,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(14,165,233,0.6)' },
        },
      },
    },
  },
  plugins: [],
}

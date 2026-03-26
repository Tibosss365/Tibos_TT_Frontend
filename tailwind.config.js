/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        glass: 'rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'app-bg': 'var(--c-app-bg)',
        'sidebar-bg': 'var(--c-sidebar-bg)',
        'card-glass': 'var(--c-card-bg)',
        'btn-primary': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'btn-danger': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      },
      boxShadow: {
        'glow-indigo': '0 0 30px rgba(99,102,241,0.25)',
        'glow-violet': '0 0 30px rgba(139,92,246,0.25)',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(99,102,241,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(99,102,241,0.6)' },
        },
      },
    },
  },
  plugins: [],
}

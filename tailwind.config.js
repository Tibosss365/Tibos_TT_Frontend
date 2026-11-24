/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // softer, rounder corners everywhere (liquid-glass look)
      borderRadius: { md: '0.625rem', lg: '0.875rem', xl: '1.25rem', '2xl': '1.75rem', '3xl': '2.25rem' },
      colors: {
        glass: 'rgba(255,255,255,0.05)',
        // ── Brand accent ─────────────────────────────────────────────────────
        // Liquid-glass theme: indigo is the single calm accent (same as --accent in
        // index.css). violet/purple stay mapped to blue so older markup keeps one hue family.
        indigo: {
          50:  '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
          400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
          800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
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

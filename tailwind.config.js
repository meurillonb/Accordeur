/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./app.js",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Palette de couleurs personnalisée pour l'accordeur
        'bg-primary': '#060609',
        'bg-secondary': '#0e0e16',
        'bg-tertiary': '#14141f',
        'border-subtle': 'rgba(255, 255, 255, 0.07)',
        'border-bright': 'rgba(255, 255, 255, 0.15)',
        'accent-amber': '#f5a623',
        'accent-amber-dim': '#a36a10',
        'accent-green': '#22c55e',
        'accent-red': '#ef4444',
        'text-primary': '#e8e8f0',
        'text-dim': '#6b6b80',
        'text-muted': '#3a3a50'
      },
      fontFamily: {
        'mono': ['DM Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'monospace'],
        'display': ['Syncopate', 'Impact', 'sans-serif'],
        'serif': ['Playfair Display', 'Georgia', 'serif']
      },
      animation: {
        'pulse-green': 'pulse-green 1s ease-in-out infinite',
        'pulse-amber': 'pulse-amber 0.5s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite'
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' }
        },
        'pulse-amber': {
          '0%': { boxShadow: '0 0 0 0 rgba(245, 166, 35, 0.4)' },
          '70%': { boxShadow: '0 0 0 10px rgba(245, 166, 35, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(245, 166, 35, 0)' }
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        }
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      screens: {
        'xs': '475px',
        // Breakpoints pour guitare mobile
        'mobile-sm': '320px',
        'mobile-lg': '414px',
        'tablet': '768px',
        'desktop': '1024px',
        // Breakpoints pour orientation
        'landscape': {'raw': '(orientation: landscape)'},
        'portrait': {'raw': '(orientation: portrait)'},
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '20px',
        '2xl': '40px',
        '3xl': '64px',
      }
    },
  },
  plugins: [
    // Plugin pour les styles personnalisés
    function({ addUtilities }) {
      const newUtilities = {
        '.glass-effect': {
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
        },
        '.gpu-accelerated': {
          'transform': 'translateZ(0)',
          'will-change': 'transform',
        },
        '.no-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
        '.no-scrollbar::-webkit-scrollbar': {
          'display': 'none',
        },
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.drag-none': {
          '-webkit-user-drag': 'none',
          '-khtml-user-drag': 'none',
          '-moz-user-drag': 'none',
          '-o-user-drag': 'none',
          'user-drag': 'none',
        }
      }
      addUtilities(newUtilities, ['responsive', 'hover'])
    }
  ],
  // Configuration pour optimiser la taille en production
  future: {
    hoverOnlyWhenSupported: true,
  },
  experimental: {
    optimizeUniversalDefaults: true,
  }
}
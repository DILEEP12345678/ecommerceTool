/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '480px',
      },
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeInScale: {
          '0%':   { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1)    translateY(0)'   },
        },
        popIn: {
          '0%':   { opacity: '0', transform: 'scale(0.85)' },
          '60%':  {               transform: 'scale(1.03)' },
          '100%': { opacity: '1', transform: 'scale(1)'    },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
        badgeBounce: {
          '0%':   { transform: 'scale(1)'    },
          '35%':  { transform: 'scale(1.55)' },
          '65%':  { transform: 'scale(0.88)' },
          '100%': { transform: 'scale(1)'    },
        },
        successFlash: {
          '0%':   { opacity: '0' },
          '15%':  { opacity: '1' },
          '75%':  { opacity: '1' },
          '100%': { opacity: '0' },
        },
        confettiFall: {
          '0%':   { transform: 'translateY(-10px) rotate(0deg)',   opacity: '1' },
          '80%':  { opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(540deg)', opacity: '0' },
        },
        comboIn: {
          '0%':   { opacity: '0', transform: 'translateX(-50%) scale(0.5)' },
          '50%':  { opacity: '1', transform: 'translateX(-50%) scale(1.2)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) scale(1)'   },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0'  },
        },
        cardEnter: {
          '0%':   { opacity: '0', transform: 'translateY(24px) scale(0.92)' },
          '55%':  { opacity: '1', transform: 'translateY(-4px)  scale(1.02)' },
          '100%': { opacity: '1', transform: 'translateY(0)     scale(1)'    },
        },
        packExit: {
          '0%':   { opacity: '1',   transform: 'translateY(0)    scale(1)',    filter: 'brightness(1)'   },
          '30%':  { opacity: '1',   transform: 'translateY(-8px)  scale(1.03)', filter: 'brightness(1.1)' },
          '100%': { opacity: '0',   transform: 'translateY(60px)  scale(0.85)', filter: 'brightness(0.8)' },
        },
        creditPop: {
          '0%':   { opacity: '0', transform: 'translateX(-50%) translateY(0)   scale(0.6)' },
          '25%':  { opacity: '1', transform: 'translateX(-50%) translateY(-8px) scale(1.2)' },
          '60%':  { opacity: '1', transform: 'translateX(-50%) translateY(-20px) scale(1)'  },
          '100%': { opacity: '0', transform: 'translateX(-50%) translateY(-40px) scale(0.9)' },
        },
      },
      animation: {
        'fade-in':       'fadeIn 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up':      'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in-scale': 'fadeInScale 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pop-in':        'popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-in-up':    'fadeInUp 0.35s cubic-bezier(0.34, 1.2, 0.64, 1) both',
        'badge-bounce':  'badgeBounce 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'success-flash': 'successFlash 0.9s ease-in-out forwards',
        'confetti-fall':  'confettiFall linear forwards',
        'combo-in':       'comboIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'card-enter':    'cardEnter 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) both',
        'shimmer':       'shimmer 1.6s ease-in-out infinite',
        'pack-exit':     'packExit 0.65s cubic-bezier(0.4, 0, 0.6, 1) forwards',
        'credit-pop':    'creditPop 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
    },
  },
  plugins: [],
};

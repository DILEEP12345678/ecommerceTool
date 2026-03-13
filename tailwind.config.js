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
      },
      animation: {
        'fade-in':       'fadeIn 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up':      'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in-scale': 'fadeInScale 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pop-in':        'popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-in-up':    'fadeInUp 0.35s cubic-bezier(0.34, 1.2, 0.64, 1) both',
        'badge-bounce':  'badgeBounce 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'success-flash': 'successFlash 0.9s ease-in-out forwards',
      },
    },
  },
  plugins: [],
};

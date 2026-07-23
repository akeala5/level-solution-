/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Classes de transition du hero choisies au runtime (heroAnimClass) -> safelist
  // pour garantir leur generation meme si le token n'apparait pas litteralement.
  safelist: ['animate-fade-in', 'animate-slide-in', 'animate-zoom-in'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A3C6E',
          50:  '#EEF3FA',
          100: '#D5E1F4',
          200: '#A8C0E7',
          300: '#7A9FD9',
          400: '#4D7ECC',
          500: '#1A3C6E',
          600: '#163362',
          700: '#122A52',
          800: '#0D2142',
          900: '#091832',
        },
        secondary: { DEFAULT: '#F97316', dark: '#EA6C00' },
        accent: {
          DEFAULT: '#27AE60',
          50:  '#EAFAF1',
          100: '#D5F5E3',
          200: '#ABEBC6',
          300: '#82E0AA',
          400: '#52BE80',
          500: '#27AE60',
          600: '#1E8449',
          700: '#196F3D',
          800: '#145A32',
          900: '#0E3D22',
        },
        success:  { DEFAULT: '#27AE60' },
        warning:  { DEFAULT: '#F59E0B' },
        danger:   { DEFAULT: '#E74C3C' },
        /* Tokens theme-aware (variables CSS définies dans globals.css) */
        dark:     'rgb(var(--fg) / <alpha-value>)',
        fg:       'rgb(var(--fg) / <alpha-value>)',
        muted:    'rgb(var(--muted) / <alpha-value>)',
        surface:  'rgb(var(--surface) / <alpha-value>)',
        border:   'rgb(var(--border) / <alpha-value>)',
        card:     'rgb(var(--card) / <alpha-value>)',
      },
      fontFamily: {
        sans:    ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      screens: { xs: '475px' },
      boxShadow: {
        card:        '0 2px 8px rgba(0,0,0,0.08)',
        'card-hover':'0 12px 32px rgba(0,0,0,0.14)',
        nav:         '0 2px 16px rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'zoom-in': 'zoomIn 0.35s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(26px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        zoomIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

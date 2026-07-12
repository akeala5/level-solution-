/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
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
        accent:   { DEFAULT: '#27AE60', 50: '#EAFAF1', 100: '#D5F5E3' },
        success:  { DEFAULT: '#27AE60' },
        warning:  { DEFAULT: '#F59E0B' },
        danger:   { DEFAULT: '#E74C3C' },
        dark:     { DEFAULT: '#1E293B' },
        muted:    { DEFAULT: '#64748B' },
        surface:  { DEFAULT: '#F8FAFC' },
        border:   { DEFAULT: '#E2E8F0' },
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
        glow:        '0 0 32px rgba(39,174,96,0.35)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1A3C6E 0%, #2563EB 100%)',
        'gradient-hero':    'linear-gradient(135deg, #0F2447 0%, #1A3C6E 50%, #1D4ED8 100%)',
        'gradient-accent':  'linear-gradient(135deg, #27AE60 0%, #1A8C4E 100%)',
      },
      animation: {
        'bounce-soft': 'bounceSoft 3s ease-in-out infinite',
        'fade-in':     'fadeIn 0.3s ease-out',
      },
      keyframes: {
        bounceSoft: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

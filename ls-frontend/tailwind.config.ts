import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
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
          100: '#D6E4F0',
          200: '#AECAE3',
          300: '#7AAFD4',
          400: '#4D95C5',
          500: '#2E7AB6',
          600: '#1A3C6E',
          700: '#153163',
          800: '#102556',
          900: '#0A1A45',
        },
        accent: {
          DEFAULT: '#E8611A',
          50:  '#FEF2EC',
          100: '#FCDEC8',
          200: '#F9BE95',
          300: '#F59D61',
          400: '#F17D30',
          500: '#E8611A',
          600: '#C54E13',
          700: '#A03C0E',
          800: '#7C2B09',
          900: '#571C05',
        },
        success: '#27AE60',
        warning: '#F39C12',
        danger: '#E74C3C',
        dark: '#1A1A2E',
        muted: '#6B7280',
        border: '#E5E7EB',
        surface: '#F9FAFB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 2px 16px rgba(26, 60, 110, 0.08)',
        'card-hover': '0 8px 32px rgba(26, 60, 110, 0.16)',
        'glow': '0 0 20px rgba(232, 97, 26, 0.3)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1A3C6E 0%, #2E5FA3 100%)',
        'gradient-accent': 'linear-gradient(135deg, #E8611A 0%, #F58A40 100%)',
        'gradient-hero': 'linear-gradient(135deg, #0A1A45 0%, #1A3C6E 50%, #2E5FA3 100%)',
        'gradient-card': 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(26,60,110,0.05) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'bounce-soft': 'bounceSoft 1s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        bounceSoft: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
      },
    },
  },
  plugins: [],
}
export default config

const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const scale = (name) =>
  Object.fromEntries(steps.map((step) => [step, `rgb(var(--c-${name}-${step}) / <alpha-value>)`]));

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Every scale reads from CSS variables (see src/styles/theme.css) so dark mode
      // can swap shades globally without touching each component
      colors: {
        primary: scale('primary'),
        accent: scale('accent'),
        success: scale('success'),
        warning: scale('warning'),
        error: scale('error'),
        info: scale('info'),
        gray: scale('gray'),
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(23, 43, 60, 0.04), 0 4px 16px rgba(23, 43, 60, 0.06)',
        lift: '0 4px 8px rgba(23, 43, 60, 0.06), 0 16px 40px rgba(23, 43, 60, 0.12)',
        glow: '0 8px 24px -6px rgba(70, 130, 180, 0.45)',
        'glow-accent': '0 8px 24px -6px rgba(255, 140, 66, 0.5)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'wave': {
          '0%, 60%, 100%': { transform: 'rotate(0deg)' },
          '10%, 30%': { transform: 'rotate(14deg)' },
          '20%': { transform: 'rotate(-8deg)' },
          '40%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(10deg)' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'page-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'pop-in': 'pop-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 1.6s infinite',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'page-in': 'page-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
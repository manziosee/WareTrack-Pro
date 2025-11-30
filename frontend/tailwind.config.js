/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E0EAF3',
          100: '#C1D6E7',
          200: '#A1C1DB',
          300: '#82ACCE',
          400: '#6397C2',
          500: '#4682B4',
          600: '#3A6D96',
          700: '#2F5778',
          800: '#23415A',
          900: '#172B3C',
        },
        accent: {
          50: '#FFF4E6',
          100: '#FFE9CC',
          200: '#FFDD99',
          300: '#FFD166',
          400: '#FFC533',
          500: '#FF8C42',
          600: '#E67A32',
          700: '#CC6B2C',
          800: '#B35C26',
          900: '#994D20',
        },
        success: {
          500: '#10B981',
          600: '#059669',
        },
        warning: {
          500: '#F59E0B',
          600: '#D97706',
        },
        error: {
          500: '#EF4444',
          600: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['Source Sans 3', 'sans-serif'],
        heading: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
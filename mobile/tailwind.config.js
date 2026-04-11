/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,ts,tsx}',
    './app/**/*.{js,ts,tsx}',
    './src/**/*.{js,ts,tsx}',
  ],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF0F5',
          100: '#FFE0EB',
          200: '#FFC2D6',
          300: '#FF94B8',
          400: '#FF6699',
          500: '#E8467C',
          600: '#D1356A',
          700: '#B02558',
          800: '#8E1A46',
          900: '#6B1235',
        },
        surface: {
          light: '#F3F3F3',
          dark: '#202020',
        },
        card: {
          light: '#FFFFFF',
          dark: '#2A2A2A',
        },
        subtle: {
          light: '#E8E8E8',
          dark: '#3A3A3A',
        },
      },
    },
  },
  plugins: [],
};

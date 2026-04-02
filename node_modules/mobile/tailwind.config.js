/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Custom colors for the app (light/dark mode handled via Tailwind's dark: prefix)
        primary: {
          50: '#E6F4FE',
          100: '#CCE9FD',
          200: '#99D3FB',
          300: '#66BCF9',
          400: '#33A6F7',
          500: '#0090F5', // Main primary color
          600: '#0073C4',
          700: '#005693',
          800: '#003A62',
          900: '#001D31',
        },
        secondary: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        }
      },
    },
  },
  plugins: [],
}

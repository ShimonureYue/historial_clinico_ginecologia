/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0A8F83',
          dark: '#06695F',
          light: '#89D5CE',
          50: '#EEFBF9',
        },
        accent: '#F6C343',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Bump the two most-used sizes up by ~2px from Tailwind defaults
        // text-xs: 12px → 14px  |  text-sm: 14px → 16px
        xs:   ['0.875rem', { lineHeight: '1.25rem' }],
        sm:   ['1rem',     { lineHeight: '1.5rem'  }],
      },
    },
  },
  plugins: [],
}

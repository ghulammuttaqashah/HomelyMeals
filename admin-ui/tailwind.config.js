/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#f97316',
          700: '#c2410c',
        },
        cook: {
          600: '#16a34a',
          700: '#15803d',
        },
      },
    },
  },
  plugins: [],
}


/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fbf7f1',
        sand: { DEFAULT: '#f1e9df', line: '#e6dacb' },
        ink: '#1f1a16',
        ember: { DEFAULT: '#c2410c', dark: '#9a3412', soft: '#fde7d6', line: '#f6c8a5' },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

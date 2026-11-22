/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Runs site palette (runs.courtflowhoops.com) — dark "night court"
      colors: {
        court: '#0c0d10',
        surface: '#15171c',
        raised: '#1e2128',
        line: '#2b2f38',
        fg: '#f4f1ea',
        muted: '#9aa0ab',
        hoop: { DEFAULT: '#ff6a1a', dark: '#e8560b', soft: '#ff6a1a1f', line: '#ff6a1a66' },
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'Impact', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

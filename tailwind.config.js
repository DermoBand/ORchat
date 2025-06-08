// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: {
          300: '#d2b48c',
          400: '#c6a27c',
          500: '#b2916d',
          600: '#9e7f5e',
        },
      },
    },
  },
  plugins: [],
}

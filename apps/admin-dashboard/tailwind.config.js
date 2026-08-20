/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          50: '#f8fafc',
          100: '#f1f5f9',
          600: '#0f172a',
          700: '#020617',
          accent: '#3b82f6'
        }
      }
    },
  },
  plugins: [],
}

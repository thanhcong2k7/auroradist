/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Định nghĩa màu động
        brand: {
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
          bg: 'var(--brand-bg)',
          surface: 'var(--brand-surface)',
        }
      }
    },
  },
  plugins: [],
}
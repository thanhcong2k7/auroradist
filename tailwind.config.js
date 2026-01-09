/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          // Cấu trúc này giúp Tailwind hiểu: rgb(R G B / alpha)
          primary: 'rgb(var(--brand-primary) / <alpha-value>)',
          secondary: 'rgb(var(--brand-secondary) / <alpha-value>)',
          bg: 'var(--brand-bg)', 
          surface: 'var(--brand-surface)',
        }
      }
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Sử dụng biến CSS đã khai báo ở index.css
          primary: 'rgb(var(--brand-primary) / <alpha-value>)',
          secondary: 'rgb(var(--brand-secondary) / <alpha-value>)',
          bg: 'rgb(var(--brand-bg) / <alpha-value>)',
          surface: '#111111',
        }
      }
    },
  },
  plugins: [],
}
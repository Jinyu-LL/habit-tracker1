/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 10px 30px rgba(79, 70, 229, 0.3)'
      }
    }
  },
  plugins: []
};

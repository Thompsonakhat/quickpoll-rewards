/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#229ED9"
      },
      boxShadow: {
        glow: "0 16px 48px rgba(34, 158, 217, 0.22)"
      }
    }
  },
  plugins: []
};

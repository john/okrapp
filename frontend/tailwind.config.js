/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rmi: {
          blue: "rgb(var(--rmi-blue) / <alpha-value>)",
          teal: "rgb(var(--rmi-teal) / <alpha-value>)",
          green: "rgb(var(--rmi-green) / <alpha-value>)",
          gray: "rgb(var(--rmi-gray) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
      },
    },
  },
  plugins: [],
}


/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      colors: {
        brand: {
          DEFAULT: "#6ee7b7",
          dim: "#34d399",
          muted: "#064e3b",
        },
      },
    },
  },
  plugins: [],
};

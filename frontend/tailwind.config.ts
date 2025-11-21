import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3A98F7",
          500: "#3A98F7"
        },
        accent: {
          from: "#6C4FF7",
          to: "#B794F4"
        }
      },
      backgroundImage: {
        "gradient-accent": "linear-gradient(90deg, #6C4FF7 0%, #B794F4 100%)"
      }
    }
  },
  plugins: []
} satisfies Config;



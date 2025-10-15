import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          background: "#0f4234",
          card: "#193f33",
          accent: "#e2b23b",
          accentHover: "#d4a22e",
          text: "#F5F7F8",
        },
      },
    },
  },
  plugins: [],
};

export default config;

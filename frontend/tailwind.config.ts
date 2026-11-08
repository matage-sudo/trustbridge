import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd",
          400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8",
          800: "#1e40af", 900: "#1e3a8a",
        },
        trust: {
          green: "#10b981", red: "#ef4444", amber: "#f59e0b",
          ink: "#0f172a", mist: "#f8fafc",
        },
      },
      fontFamily: { sans: ["var(--font-montserrat)", "system-ui", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)" },
    },
  },
  plugins: [],
};
export default config;

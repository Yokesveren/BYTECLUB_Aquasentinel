/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-deep": "#07101f",
        "bg-panel": "rgba(9, 18, 35, 0.80)",
        "bg-card": "rgba(11, 22, 42, 0.75)",
        "accent-teal": "#00d4aa",
        "accent-blue": "#378add",
        "accent-amber": "#f5a623",
        "accent-red": "#e74c3c",
        "text-primary": "#e8edf5",
        "text-secondary": "#7a8ba8",
        "text-muted": "#3a5070",
        "border-color": "#1a2d45",
        "border-strong": "#2a4060",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["'Space Grotesk'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  plugins: [],
  theme: {
    extend: {
      boxShadow: {
        elevated:
          "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        surface:
          "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
      },
      colors: {
        bg: {
          base: "var(--color-bg-base)",
          subtle: "var(--color-bg-subtle)",
          surface: "var(--color-bg-surface)",
        },
        border: {
          subtle: "var(--color-border)",
        },
        brand: {
          accent: "var(--color-accent)",
          onPrimary: "var(--color-on-primary)",
          primary: "var(--color-primary)",
        },
        destructive: "var(--color-destructive)",
        ring: {
          brand: "var(--color-ring)",
        },
        success: "var(--color-success)",
        text: {
          main: "var(--color-text-main)",
          muted: "var(--color-text-muted)",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
};

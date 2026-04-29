import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        arc: {
          bg: "var(--arc-bg)",
          panel: "var(--arc-panel)",
          panelStrong: "var(--arc-panel-strong)",
          border: "var(--arc-border)",
          text: "var(--arc-text)",
          textMuted: "var(--arc-text-muted)",
          cyan: "var(--arc-cyan)",
          blue: "var(--arc-blue)",
        }
      },
    },
  },
  plugins: [],
};
export default config;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* 30% — Brand (navigation, headers, primary actions) */
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          dark: "var(--brand-dark)",
          light: "var(--brand-light)",
          surface: "var(--brand-surface)",
          text: "var(--brand-text)",
        },
        /* 10% — Accent (CTAs, highlights, rewards, badges) */
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          light: "var(--accent-light)",
          text: "var(--accent-text)",
        },
        /* Semantic */
        ok: {
          DEFAULT: "var(--success)",
          light: "var(--success-light)",
          text: "var(--success-text)",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FEE2E2",
          text: "#991B1B",
        },
        /* 60% — Neutral base surfaces */
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          bg: "var(--background)",
        },
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",
        muted: "var(--text-muted)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
        light: "var(--border-light)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.08)",
        nav: "0 -1px 12px rgba(0,0,0,0.04)",
        "soft": "0 2px 8px rgba(0,0,0,0.05)",
        "elevated": "0 8px 30px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        "2.5xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom, 0px)",
        "safe-top": "env(safe-area-inset-top, 0px)",
      },
      screens: {
        "xs": "375px",
        "pwa": { raw: "(display-mode: standalone)" },
      },
    },
  },
  plugins: [],
};

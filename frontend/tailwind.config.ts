import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        body: "hsl(var(--body))",
        "body-strong": "hsl(var(--body-strong))",
        "hairline-soft": "hsl(var(--hairline-soft))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        surface: {
          soft: "hsl(var(--surface-soft))",
          card: "hsl(var(--surface-card))",
          strong: "hsl(var(--surface-strong))",
          dark: "hsl(var(--surface-dark))",
          "dark-elevated": "hsl(var(--surface-dark-elevated))",
        },
        brand: {
          pink: "var(--brand-pink)",
          teal: "var(--brand-teal)",
          lavender: "var(--brand-lavender)",
          peach: "var(--brand-peach)",
          ochre: "var(--brand-ochre)",
          mint: "var(--brand-mint)",
          coral: "var(--brand-coral)",
        },
        chart: {
          "series-1": "var(--chart-series-1)",
          "series-2": "var(--chart-series-2)",
          "series-3": "var(--chart-series-3)",
          "series-4": "var(--chart-series-4)",
          "series-5": "var(--chart-series-5)",
          "seq-1": "var(--chart-seq-1)",
          "seq-2": "var(--chart-seq-2)",
          "seq-3": "var(--chart-seq-3)",
          "seq-4": "var(--chart-seq-4)",
          credit: "var(--chart-credit)",
          debit: "var(--chart-debit)",
          neutral: "var(--chart-neutral)",
          grid: "var(--chart-grid)",
          axis: "var(--chart-axis)",
        },
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "Arial", "sans-serif"],
      },
      fontSize: {
        "display-xl": [
          "var(--text-display-xl)",
          { lineHeight: "1", letterSpacing: "-0.05em", fontWeight: "500" },
        ],
        "display-lg": [
          "var(--text-display-lg)",
          { lineHeight: "1.05", letterSpacing: "-0.05em", fontWeight: "500" },
        ],
        "display-md": [
          "var(--text-display-md)",
          { lineHeight: "1.1", letterSpacing: "-0.05em", fontWeight: "500" },
        ],
        "display-sm": [
          "var(--text-display-sm)",
          { lineHeight: "1.15", letterSpacing: "-0.05em", fontWeight: "500" },
        ],
        "title-lg": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.0125em" }],
        "title-md": ["1.125rem", { lineHeight: "1.4" }],
        "title-sm": ["1rem", { lineHeight: "1.4" }],
        "body-md": ["1rem", { lineHeight: "1.55" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55" }],
        caption: ["0.8125rem", { lineHeight: "1.4" }],
        "caption-uppercase": [
          "0.75rem",
          { lineHeight: "1.4", letterSpacing: "0.125em", fontWeight: "600" },
        ],
      },
      spacing: {
        section: "var(--space-section)",
      },
    },
  },
  plugins: [],
};

export default config;

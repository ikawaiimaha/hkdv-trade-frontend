/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        nunito: ['Nunito', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      /* MomoMint Color System */
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        momo: {
          pink: '#FF8CC6',
          'pink-dark': '#FF3B93',
          'pink-light': '#FFF6FA',
          lavender: '#BFA2FF',
          bg: '#FFEAF3',
          surface: '#FFF6FA',
          border: '#FFD6EC',
          'text-primary': '#4A1838',
          'text-secondary': '#7A4A68',
          'text-muted': '#B08AA0',
          purple: '#7B5EAA',
          mint: '#9EE6C4',
          peach: '#FFC8A2',
          'blue-soft': '#A7D8FF',
          'yellow-soft': '#FFF3A3',
        },
      },
      /* MomoMint Border Radius System */
      borderRadius: {
        sm: '12px',
        md: '20px',
        lg: '24px',
        xl: '28px',
        full: '999px',
        '2xl': '28px',
        '3xl': '32px',
      },
      /* MomoMint Spacing System (8pt) */
      spacing: {
        'micro': '4px',
        'tight': '8px',
        'small': '12px',
        'standard': '16px',
        'section': '24px',
        'major': '32px',
        'layout': '40px',
      },
      /* Font sizes from design system */
      fontSize: {
        'h1': ['20px', { lineHeight: '1.2', fontWeight: '900' }],
        'h2': ['16px', { lineHeight: '1.3', fontWeight: '900' }],
        'body': ['13px', { lineHeight: '1.5', fontWeight: '500' }],
        'caption': ['11px', { lineHeight: '1.4', fontWeight: '700' }],
        'chip': ['11px', { lineHeight: '1', fontWeight: '700' }],
      },
      boxShadow: {
        soft: '0 2px 16px rgba(255, 140, 198, 0.12)',
        'soft-hover': '0 4px 24px rgba(255, 140, 198, 0.18)',
        'soft-lg': '0 8px 32px rgba(255, 140, 198, 0.15)',
      },
      maxWidth: {
        'content': '640px',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

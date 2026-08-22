
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        // Mobile - Small
        'xs': '480px',
        // Mobile - Standard
        'sm': '640px',
        // Tablet
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        // Desktop
        '2xl': '1536px',
        // Mac Large Screens
        '3xl': '1920px',
        '4xl': '2560px',
        '5xl': '3440px',
      },
      fontFamily: {
        sans: ['var(--font-sans, "Cairo")', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        }
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
      colors: {
        accent: 'var(--accent, #10b981)',
        // Theme-aware colors using CSS variables with better fallbacks for day mode
        'app-text': 'var(--app-text, #1f2937)',
        'app-text-secondary': 'var(--app-text-secondary, #6b7280)',
        'app-bg': 'var(--app-bg, #ffffff)',
        'app-surface': 'var(--app-surface, #f9fafb)',
        'app-surface-hover': 'var(--app-surface-hover, #f3f4f6)',
        'app-border': 'var(--app-border, #e5e7eb)',
        brand: {
          dark: '#111827',
          blue: '#0ea5e9',
          navy: '#1F4E78',
        },
      },
      maxWidth: {
        'app': '1920px',
        'mac': '2560px',
        'ultra': '3440px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        none: '0',
        sm: 'calc(var(--radius, 0.5rem) - 0.2rem)',
        DEFAULT: 'var(--radius, 0.5rem)',
        md: 'calc(var(--radius, 0.5rem) + 0.1rem)',
        lg: 'calc(var(--radius, 0.5rem) + 0.2rem)',
        xl: 'calc(var(--radius, 0.5rem) + 0.4rem)',
        '2xl': 'calc(var(--radius, 0.5rem) + 0.6rem)',
        '3xl': 'calc(var(--radius, 0.5rem) + 1rem)',
        full: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        DEFAULT: '0 2px 4px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        md: '0 4px 8px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        lg: '0 8px 16px -4px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.03)',
        xl: '0 12px 24px -6px rgba(0, 0, 0, 0.10)',
        '2xl': '0 16px 32px -8px rgba(0, 0, 0, 0.12)',
        inner: 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sharp': '1px 1px 0 0 var(--tw-shadow-color, #000)',
      }
    }
  },
  plugins: [],
}

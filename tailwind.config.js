
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
      stat: {
        red: '#fee2e2',
        redText: '#ef4444',
        orange: '#ffedd5',
        orangeText: '#f97316',
        green: '#dcfce7',
        greenText: '#10b981',
        blue: '#e0f2fe',
        blueText: '#0ea5e9',
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
        sm: '0 1px 2px 0 rgb(0 0 0 / calc(var(--shadow-strength, 0.05) * 1))',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / calc(var(--shadow-strength, 0.1) * 1)), 0 1px 2px -1px rgb(0 0 0 / calc(var(--shadow-strength, 0.1) * 1))',
        md: '0 4px 6px -1px rgb(0 0 0 / calc(var(--shadow-strength, 0.1) * 1)), 0 2px 4px -2px rgb(0 0 0 / calc(var(--shadow-strength, 0.1) * 1))',
        lg: '0 10px 15px -3px rgb(0 0 0 / calc(var(--shadow-strength, 0.1) * 1)), 0 4px 6px -4px rgb(0 0 0 / calc(var(--shadow-strength, 0.1) * 0.7))',
        xl: '0 20px 25px -5px rgb(0 0 0 / calc(var(--shadow-strength, 0.1) * 1)), 0 8px 10px -6px rgb(0 0 0 / calc(var(--shadow-strength, 0.1) * 0.7))',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / calc(var(--shadow-strength, 0.1) * 2.5))',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / calc(var(--shadow-strength, 0.05) * 1))',
        'sharp': '2px 2px 0 0 var(--tw-shadow-color, #000)',
      }
    }
  },
  plugins: [],
}

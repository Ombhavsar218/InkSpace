/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aura: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        canvas: {
          dark: '#121214',
          darker: '#0c0c0e',
          cardDark: '#1a1a1e',
          borderDark: '#2a2a30',
          light: '#f8fafc',
          lighter: '#ffffff',
          cardLight: '#ffffff',
          borderLight: '#e2e8f0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        hand: ['"Caveat"', '"Kalam"', '"Comic Sans MS"', 'cursive', 'sans-serif'],
        mono: ['"Fira Code"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-light': '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
        'glow': '0 0 25px -5px rgba(139, 92, 246, 0.5)',
      }
    },
  },
  plugins: [],
}

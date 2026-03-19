/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zevo: {
          orange: '#FF6B2B',
          'orange-light': '#FF9A6C',
          black: '#0D0D0D',
          card: '#1E1E1E',
          surface: '#2A2A2A',
          text: '#F5F5F3',
          'text-secondary': 'rgba(245,245,243,0.6)',
          border: 'rgba(255,255,255,0.08)',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        skeleton: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        }
      }
    },
  },
  plugins: [],
}

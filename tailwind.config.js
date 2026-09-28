/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          950: '#0a0d13',
          900: '#10141c',
          800: '#171d28',
          700: '#1e2532',
          600: '#262e3d',
        },
        nova: {
          cyan: '#64D2FF',
          violet: '#BF5AF2',
          gold: '#FFD60A',
          blue: '#0A84FF',
        },
        line: 'rgba(255,255,255,0.075)',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display',
          'Inter var', 'Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif',
        ],
      },
      boxShadow: {
        glass: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.4)',
      },
      transitionTimingFunction: {
        'ease-out-quart': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'spring': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};

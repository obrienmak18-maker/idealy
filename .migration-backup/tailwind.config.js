/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f5f6fa',
          100: '#e7e9f2',
          200: '#c9cde0',
          300: '#9ba1c2',
          400: '#6b7196',
          500: '#474d70',
          600: '#2f3454',
          700: '#1d2138',
          800: '#12152a',
          900: '#0a0c1c',
          950: '#05060f',
        },
        electric: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        ember: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          400: '#facc15',
          500: '#eab308',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        // Way palettes
        ninja: {
          primary: '#f97316',
          glow: '#fb923c',
          deep: '#1a1206',
        },
        mage: {
          primary: '#3b82f6',
          glow: '#60a5fa',
          deep: '#06121f',
        },
        hunter: {
          primary: '#22c55e',
          glow: '#4ade80',
          deep: '#06140a',
        },
        pro: {
          primary: '#94a3b8',
          glow: '#cbd5e1',
          deep: '#0a0f1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'halo': 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.18), transparent 60%)',
        'ember-halo': 'radial-gradient(circle at 50% 0%, rgba(249,115,22,0.16), transparent 60%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'drift': {
          '0%': { transform: 'translate(0,0)' },
          '50%': { transform: 'translate(20px,-20px)' },
          '100%': { transform: 'translate(0,0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'drift': 'drift 18s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};

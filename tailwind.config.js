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
        abyss: {
          DEFAULT: '#090D16',
          900: '#06090F',
          800: '#090D16',
          700: '#0F172A',
        },
        surface: {
          DEFAULT: '#131B2E',
          card: '#131B2E',
          light: '#1B2640',
          hover: '#223052',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-active': 'rgba(16, 185, 129, 0.4)',
        },
        emeraldNeon: {
          DEFAULT: '#10B981',
          glow: 'rgba(16, 185, 129, 0.25)',
          light: '#34D399',
          dark: '#059669',
        },
        electricIndigo: {
          DEFAULT: '#6366F1',
          glow: 'rgba(99, 102, 241, 0.3)',
          light: '#818CF8',
          dark: '#4F46E5',
        },
        crimsonRed: {
          DEFAULT: '#EF4444',
          glow: 'rgba(239, 68, 68, 0.25)',
          light: '#F87171',
          dark: '#DC2626',
        },
        cyberCyan: {
          DEFAULT: '#06B6D4',
          glow: 'rgba(6, 182, 212, 0.25)',
        },
        amberAlert: {
          DEFAULT: '#F59E0B',
          glow: 'rgba(245, 158, 11, 0.25)',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'neon-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.45)',
        'neon-indigo': '0 0 20px -3px rgba(99, 102, 241, 0.45)',
        'neon-crimson': '0 0 20px -3px rgba(239, 68, 68, 0.45)',
        'cyber-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        glowPulse: {
          '0%': { boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(16, 185, 129, 0.6)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}

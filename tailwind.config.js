/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#3A7D44',     // Deep Green
          dark: '#24552F',        // Dark Green
          cream: '#F7F2E8',       // Cream
          softCream: '#FCFAF5',   // Soft Cream
          darkText: '#18201A',    // Dark Text
          mutedText: '#6F756F',   // Muted Text
          warning: '#D97706',     // Warm Amber
          error: '#EF4444',       // Muted Red
          success: '#10B981',     // Green
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 4px 20px -2px rgba(24, 32, 26, 0.05), 0 2px 8px -1px rgba(24, 32, 26, 0.03)',
        glass: '0 8px 32px 0 rgba(36, 85, 47, 0.05)',
      },
      animation: {
        'waveform': 'waveform 1.2s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 2s infinite',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        waveform: {
          '0%, 100%': { height: '8px' },
          '50%': { height: '28px' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.02)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}

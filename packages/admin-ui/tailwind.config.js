module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#f97316',
          'orange-dark': '#ea580c',
          purple: '#9333ea',
          'purple-dark': '#7e22ce',
          violet: '#8b5cf6'
        },
        surface: {
          DEFAULT: '#0a0a12',
          raised: '#0f0f1a',
          overlay: '#14141f'
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.3s ease both',
        'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 4s linear infinite',
        'gradient-shift': 'gradientShift 6s ease infinite',
        'scan-line': 'scanLine 4s linear infinite',
        'rotate-ring': 'rotateRing 4s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(249, 115, 22, 0.3), 0 0 20px rgba(249, 115, 22, 0.1)' },
          '50%': { boxShadow: '0 0 16px rgba(249, 115, 22, 0.5), 0 0 40px rgba(249, 115, 22, 0.2)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' }
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' }
        },
        scanLine: {
          '0%': { top: '-2px' },
          '100%': { top: '100%' }
        },
        rotateRing: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' }
        }
      }
    }
  },
  plugins: []
};

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
        // Flat UI Colors from flatuicolors.com
        // Primary - Peter River (Blue)
        primary: {
          50: '#EBF5FB',
          100: '#D6EAF8',
          200: '#AED6F1',
          300: '#85C1E9',
          400: '#5DADE2',
          500: '#3498DB', // Main brand color - Peter River
          600: '#2874A6',
          700: '#1F618D',
          800: '#1A5276',
          900: '#154360',
        },
        // Secondary - Wet Asphalt (Dark Gray)
        secondary: {
          50: '#EBEDEF',
          100: '#D5DBDB',
          200: '#ABB2B9',
          300: '#808B96',
          400: '#566573',
          500: '#34495E', // Wet Asphalt
          600: '#2C3E50', // Midnight Blue
          700: '#212F3D',
          800: '#1B2631',
          900: '#17202A',
        },
        // Accent - Amethyst (Purple)
        accent: {
          50: '#F4ECF7',
          100: '#E8DAEF',
          200: '#D2B4DE',
          300: '#BB8FCE',
          400: '#A569BD',
          500: '#9B59B6', // Amethyst
          600: '#7D3C98',
          700: '#6C3483',
          800: '#5B2C6F',
          900: '#4A235A',
        },
        // Success - Emerald (Green)
        success: {
          50: '#EAFAF1',
          100: '#D5F5E3',
          200: '#ABEBC6',
          300: '#82E0AA',
          400: '#58D68D',
          500: '#2ECC71', // Emerald
          600: '#229954',
          700: '#1E8449',
          800: '#196F3D',
          900: '#145A32',
        },
        // Warning - Sun Flower (Yellow)
        warning: {
          50: '#FEF9E7',
          100: '#FCF3CF',
          200: '#F9E79F',
          300: '#F7DC6F',
          400: '#F4D03F',
          500: '#F1C40F', // Sun Flower
          600: '#D4AC0D',
          700: '#B7950B',
          800: '#9A7D0A',
          900: '#7D6608',
        },
        // Error - Alizarin (Red)
        error: {
          50: '#FADBD8',
          100: '#F5B7B1',
          200: '#F1948A',
          300: '#EC7063',
          400: '#E74C3C', // Alizarin
          500: '#C0392B',
          600: '#A93226',
          700: '#922B21',
          800: '#7B241C',
          900: '#641E16',
        },
        // Background Colors - Improved contrast for dark mode
        background: {
          light: '#ECF0F1', // Clouds
          dark: '#1A1F2E', // Darker, richer background
          surface: '#FFFFFF',
          surfaceDark: '#252B3A', // Lighter than background for better contrast
        },
        // Text Colors - Improved readability
        text: {
          primary: {
            light: '#2C3E50', // Midnight Blue
            dark: '#F5F7FA', // Brighter white for better contrast
          },
          secondary: {
            light: '#566573',
            dark: '#E2E8F0', // Brighter secondary text
          },
          muted: {
            light: '#808B96',
            dark: '#CBD5E0', // Brighter muted text
          },
        },
        // Border Colors - Better visibility
        border: {
          light: '#BDC3C7', // Silver
          dark: '#475569', // Lighter border for dark mode
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 4px 16px rgba(0, 0, 0, 0.1)',
        'instagram': '0 2px 12px rgba(0, 0, 0, 0.08)',
        'instagram-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'card-hover': '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(52, 152, 219, 0.5), 0 0 10px rgba(52, 152, 219, 0.3)' },
          '100%': { boxShadow: '0 0 10px rgba(52, 152, 219, 0.8), 0 0 20px rgba(52, 152, 219, 0.5)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
}



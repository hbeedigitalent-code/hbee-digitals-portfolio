import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ── Font family ── */
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        primary: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        heading: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },

      /* ── Font sizes with optimized line-heights ── */
      fontSize: {
        'xs':   ['0.75rem',  { lineHeight: '1',   letterSpacing: '0.04em'  }],
        'sm':   ['0.875rem', { lineHeight: '1.4',  letterSpacing: '-0.01em' }],
        'base': ['1rem',     { lineHeight: '1.6',  letterSpacing: '-0.01em' }],
        'lg':   ['1.125rem', { lineHeight: '1.6',  letterSpacing: '-0.01em' }],
        'xl':   ['1.25rem',  { lineHeight: '1.4',  letterSpacing: '-0.01em' }],
        '2xl':  ['1.5rem',   { lineHeight: '1.2',  letterSpacing: '-0.02em' }],
        '3xl':  ['1.875rem', { lineHeight: '1.2',  letterSpacing: '-0.02em' }],
        '4xl':  ['2.25rem',  { lineHeight: '1.1',  letterSpacing: '-0.03em' }],
        '5xl':  ['3rem',     { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        '6xl':  ['3.75rem',  { lineHeight: '1',    letterSpacing: '-0.04em' }],
        '7xl':  ['4.5rem',   { lineHeight: '1',    letterSpacing: '-0.04em' }],
        
        /* semantic aliases */
        'display':  ['clamp(2.25rem,5vw,3.75rem)', { lineHeight: '1', letterSpacing: '-0.04em' }],
        'hero':     ['clamp(2.25rem,5vw,3.75rem)', { lineHeight: '1', letterSpacing: '-0.04em' }],
        'h1':       ['clamp(1.875rem,4vw,3rem)',    { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'h2':       ['clamp(1.5rem,3vw,1.875rem)',  { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'h3':       ['1.5rem',                      { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        'h4':       ['1.25rem',                     { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'body':     ['1rem',                        { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        'caption':  ['0.875rem',                    { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'label':    ['0.75rem',                     { lineHeight: '1',   letterSpacing: '0.04em'  }],
      },

      /* ── Font weights ── */
      fontWeight: {
        regular:   '400',
        medium:    '500',
        semibold:  '600',
        bold:      '700',
        extrabold: '800',
        black:     '900',
      },

      /* ── Letter spacing ── */
      letterSpacing: {
        'tighter': '-0.04em',
        'tight':   '-0.03em',
        'snug':    '-0.02em',
        'normal':  '-0.01em',
        'wide':     '0.04em',
        'wider':    '0.08em',
        'widest':   '0.12em',
      },

      /* ── NEW COLOR SYSTEM (Based on Audit) ── */
      colors: {
        /* Navy Scale - Primary brand color */
        navy: {
          50: '#E8EDF5',
          100: '#D1DBEB',
          200: '#A3B7D7',
          300: '#7593C3',
          400: '#476FAF',
          500: '#1A4B9B',
          600: '#153C7C',
          700: '#102D5D',
          800: '#0A1E3E',
          900: '#0B1628',
          DEFAULT: '#0B1628',
        },
        /* Orange Accent - CTAs only */
        orange: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          DEFAULT: '#F97316',
        },
        /* Blue Accent - Secondary actions, links */
        blue: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          DEFAULT: '#3B82F6',
        },
        /* Gray Scale - Backgrounds, borders */
        gray: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        /* Legacy support - Keep existing colors for backward compatibility */
        primary: "#007BFF",
        "primary-light": "#00BFFF",
        accent: "#00FFFF",
        "primary-dark": "#004aad",
        background: "#ffffff",
        text: "#1F2937",
        "text-muted": "#6B7280",
        "light-gray": "#f3f4f6",
        border: "#e5e7eb",
      },

      /* ── Gradients ── */
      backgroundImage: {
        'gradient-accent':  'linear-gradient(90deg, #39D97A 0%, #C6F135 100%)',
        'gradient-hero':    'linear-gradient(135deg, #0B1628 0%, #1A2B47 100%)',
        'gradient-section': 'linear-gradient(135deg, #1A2B47 0%, #2A3F5F 100%)',
        'gradient-light':   'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
        'gradient-orange':  'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
        'gradient-blue':    'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      },

      /* ── Border Radius ── */
      borderRadius: {
        'xl':  '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        'pill': '9999px',
      },

      /* ── Box Shadows ── */
      boxShadow: {
        'brand-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'brand-md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'brand-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        'brand-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.12)',
        'dark-sm':  '0 1px 3px rgba(0, 0, 0, 0.30)',
        'dark-md':  '0 4px 16px rgba(0, 0, 0, 0.40)',
        'dark-lg':  '0 8px 32px rgba(0, 0, 0, 0.50)',
      },

      /* ── Spacing Extensions ── */
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '104': '26rem',
        '120': '30rem',
        '144': '36rem',
      },

      /* ── Max Width ── */
      maxWidth: {
        'container': '1280px',
        '8xl': '1400px',
        '9xl': '1600px',
      },

      /* ── Animations ── */
      animation: {
        'fade-up':   'fadeUp 0.5s ease forwards',
        'fade-in':   'fadeIn 0.4s ease forwards',
        'slide-up':  'slideUp 0.5s ease forwards',
        'slide-in':  'slideIn 0.4s ease forwards',
        'scale-in':  'scaleIn 0.4s ease forwards',
        'marquee':   'marquee 30s linear infinite',
        'spin-slow': 'spin 20s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      
      keyframes: {
        fadeUp: { 
          from: { opacity: '0', transform: 'translateY(20px)' }, 
          to: { opacity: '1', transform: 'translateY(0)' } 
        },
        fadeIn: { 
          from: { opacity: '0' }, 
          to: { opacity: '1' } 
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
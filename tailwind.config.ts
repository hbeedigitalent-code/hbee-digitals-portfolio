import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {

      /* ── Font family ── */
      fontFamily: {
        sans: ['var(--font-primary)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        primary: ['var(--font-primary)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },

      /* ── Font sizes with Inter-optimised line-heights ── */
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

      /* ── Letter spacing (Inter-optimised) ── */
      letterSpacing: {
        'tighter': '-0.04em',
        'tight':   '-0.03em',
        'snug':    '-0.02em',
        'normal':  '-0.01em',
        'wide':     '0.04em',
        'wider':    '0.08em',
        'widest':   '0.12em',
      },

      /* ── Brand colours ── */
      colors: {
        navy: {
          DEFAULT: '#0A1D37',
          mid:     '#0F3460',
          light:   '#1B4F8A',
          dark:    '#070F1D',
        },
        green: {
          DEFAULT: '#39D97A',
          dark:    '#1AB85C',
          mid:     '#7DE84A',
        },
        lime:    { DEFAULT: '#C6F135' },
        surface: {
          white:  '#FFFFFF',
          off:    '#F5F7FA',
          light:  '#EEF2F8',
          border: '#DDE3EE',
        },
      },

      /* ── Gradients ── */
      backgroundImage: {
        'gradient-accent':  'linear-gradient(90deg, #39D97A 0%, #C6F135 100%)',
        'gradient-hero':    'linear-gradient(135deg, #0A1D37 0%, #0F3460 100%)',
        'gradient-section': 'linear-gradient(135deg, #0F3460 0%, #1B4F8A 100%)',
        'gradient-light':   'linear-gradient(135deg, #F5F7FA 0%, #EEF2F8 100%)',
      },

      borderRadius: {
        'xl':  '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        'pill':'9999px',
      },

      boxShadow: {
        'brand-sm': '0 1px 3px rgba(10, 29, 55, 0.08)',
        'brand-md': '0 4px 16px rgba(10, 29, 55, 0.10)',
        'brand-lg': '0 8px 32px rgba(10, 29, 55, 0.12)',
        'dark-sm':  '0 1px 3px rgba(0, 0, 0, 0.30)',
        'dark-md':  '0 4px 16px rgba(0, 0, 0, 0.40)',
        'dark-lg':  '0 8px 32px rgba(0, 0, 0, 0.50)',
      },

      animation: {
        'fade-up':  'fadeUp 0.5s ease forwards',
        'fade-in':  'fadeIn 0.4s ease forwards',
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
      },
    },
  },
  plugins: [],
}

export default config
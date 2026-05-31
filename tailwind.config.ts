/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#0A1D37',
        'brand-secondary': '#FFFFFF',
        'brand-dark': '#1F2937',
        'brand-white': '#FFFFFF',
        'brand-green': '#39D97A',
        'brand-lime': '#C6F135',
        'brand-accent-text': '#1AB85C',
      },
      fontFamily: {
        inter: ['var(--font-inter)', 'sans-serif'],
        poppins: ['var(--font-poppins)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

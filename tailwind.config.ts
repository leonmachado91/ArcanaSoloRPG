import type { Config } from 'tailwindcss';

const arcanaInk = {
  950: '#030303',
  900: '#080808',
  800: '#0f1116',
  700: '#171b24',
};

const arcanaParchment = {
  50: '#fdfbf4',
  100: '#f5f0e1',
  200: '#e6dcc0',
  300: '#d4c5a3',
};

const arcanaEmber = {
  300: '#ffd08a',
  400: '#f8b153',
  500: '#ea8a1a',
};

const arcanaAura = {
  200: '#c0daff',
  300: '#93bcff',
  400: '#6a9bff',
  500: '#4f7ae6',
};

const arcanaVerdant = {
  200: '#c5f3d8',
  300: '#9fe4bf',
  400: '#5fc59a',
  500: '#2e9c70',
};

const arcanaRose = {
  200: '#f7c6d9',
  400: '#f38bb5',
  500: '#e45d87',
};

const config = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cinzel', 'serif'],
        bodySerif: ['Merriweather', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'heading-hero': ['3.25rem', { lineHeight: '1.1', letterSpacing: '0.01em' }],
        'heading-xl': ['2.5rem', { lineHeight: '1.2', letterSpacing: '0.01em' }],
        'body-lg': ['1.125rem', { lineHeight: '1.65' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
      },
      colors: {
        arcana: {
          ink: arcanaInk,
          parchment: arcanaParchment,
          ember: arcanaEmber,
          aura: arcanaAura,
          verdant: arcanaVerdant,
          rose: arcanaRose,
        },
      },
      boxShadow: {
        'arcana-card': '0 30px 80px -40px rgba(0, 0, 0, 0.65), 0 20px 40px -25px rgba(15, 23, 42, 0.55)',
        'arcana-glow': '0 0 40px rgba(234, 138, 26, 0.25), 0 0 80px rgba(106, 155, 255, 0.25)',
        'arcana-focus': '0 0 0 3px rgba(106, 155, 255, 0.45)',
      },
      backgroundImage: {
        'arcana-radial':
          'radial-gradient(circle at 20% 20%, rgba(234, 138, 26, 0.25), transparent 55%), radial-gradient(circle at 80% 0%, rgba(106, 155, 255, 0.25), transparent 45%)',
        'arcana-grid':
          'linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 0), linear-gradient(180deg, rgba(255, 255, 255, 0.04) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;

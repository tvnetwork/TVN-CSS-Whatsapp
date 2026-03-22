import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050816',
      },
      boxShadow: {
        glow: '0 24px 90px rgba(59, 130, 246, 0.25)',
      },
      backgroundImage: {
        'hero-gradient':
          'radial-gradient(circle at top left, rgba(59,130,246,0.35), transparent 30%), radial-gradient(circle at top right, rgba(168,85,247,0.28), transparent 28%), linear-gradient(135deg, #050816 0%, #0f172a 48%, #111827 100%)',
      },
    },
  },
  plugins: [],
};

export default config;

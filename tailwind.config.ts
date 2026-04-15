import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0cb8b6',
          hover: '#0aa3a1',
          light: '#e0f7f7',
        },
        dark: '#1a2b3c',
        muted: '#6b7b8d',
        background: '#f5f7fa',
      },
      borderRadius: {
        xl: '12px',
      },
    },
  },
  plugins: [],
}

export default config

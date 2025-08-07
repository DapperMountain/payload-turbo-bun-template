import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config

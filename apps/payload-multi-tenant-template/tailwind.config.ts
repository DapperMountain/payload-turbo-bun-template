import path from 'path'
import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'
import { isolateInsideOfContainer, scopedPreflightStyles } from 'tailwindcss-scoped-preflight'

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './src/**/*.{ts,tsx}',
    path.join(path.dirname(require.resolve('@dappermountain/design-system')), '**/*.{js,ts,jsx,tsx}'),
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        primary: '#1E40AF',
      },
    },
  },
  plugins: [
    scopedPreflightStyles({
      isolationStrategy: isolateInsideOfContainer(['.tw']),
    }),
    tailwindcssAnimate,
  ],
}

export default config

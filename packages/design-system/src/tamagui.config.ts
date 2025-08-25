import * as Colors from '@tamagui/colors'
import { defaultConfig } from '@tamagui/config/v4'
import { shorthands as tamaguiShorthands } from '@tamagui/shorthands'
import { createThemes, defaultComponentThemes } from '@tamagui/theme-builder'
import { createTamagui } from 'tamagui'

/** ---- Tokens (single source) ----
 * IMPORTANT: Tamagui requires size.true and space.true to mirror your default.
 */
export const tokens = {
  size: { 1: 24, 2: 28, 3: 32, 4: 36, 5: 40, 6: 48, 7: 56, 8: 64, true: 36 },
  space: { 0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, true: 8 },
  radius: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, round: 9999 },
  zIndex: { 0: 0, 1: 1, 10: 10, 100: 100, 1000: 1000 },
  // You can add color tokens you want to reference outside theme variables; not required by theme-builder.
  color: {},
} as const

/** ---- Fonts / media / shorthands (shared, minimal) ---- */
export const fonts = {
  body: {
    family:
      'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, Apple Color Emoji, Segoe UI Emoji',
    size: { 1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6: 24, 7: 28, 8: 32 },
    lineHeight: { 1: 16, 2: 20, 3: 24, 4: 28, 5: 28, 6: 32, 7: 36, 8: 40 },
    weight: { 1: '400', 2: '500', 3: '600', 4: '700' },
    letterSpacing: { 1: 0, 2: 0, 3: 0, 4: 0 },
  },
} as const

export const media = {
  xs: { maxWidth: 599 },
  sm: { minWidth: 600 },
  md: { minWidth: 904 },
  lg: { minWidth: 1240 },
  xl: { minWidth: 1440 },
  short: { maxHeight: 820 },
  tall: { minHeight: 820 },
  hoverNone: { hover: 'none' as const },
  pointerCoarse: { pointer: 'coarse' as const },
} as const

export const shorthands = {
  ...tamaguiShorthands,
  bg: 'backgroundColor',
  br: 'borderRadius',
} as const

/** ---- Theme-builder (inlined; no separate file) ---- */
const darkPalette = [
  'hsla(0, 15%, 1%, 1)',
  'hsla(0, 15%, 6%, 1)',
  'hsla(0, 15%, 12%, 1)',
  'hsla(0, 15%, 17%, 1)',
  'hsla(0, 15%, 23%, 1)',
  'hsla(0, 15%, 28%, 1)',
  'hsla(0, 15%, 34%, 1)',
  'hsla(0, 15%, 39%, 1)',
  'hsla(0, 15%, 45%, 1)',
  'hsla(0, 15%, 50%, 1)',
  'hsla(0, 15%, 93%, 1)',
  'hsla(0, 15%, 99%, 1)',
]
const lightPalette = [
  'hsla(0, 15%, 99%, 1)',
  'hsla(0, 15%, 94%, 1)',
  'hsla(0, 15%, 88%, 1)',
  'hsla(0, 15%, 83%, 1)',
  'hsla(0, 15%, 77%, 1)',
  'hsla(0, 15%, 72%, 1)',
  'hsla(0, 15%, 66%, 1)',
  'hsla(0, 15%, 61%, 1)',
  'hsla(0, 15%, 55%, 1)',
  'hsla(0, 15%, 50%, 1)',
  'hsla(0, 15%, 15%, 1)',
  'hsla(0, 15%, 1%, 1)',
]

const lightShadows = {
  shadow1: 'rgba(0,0,0,0.04)',
  shadow2: 'rgba(0,0,0,0.08)',
  shadow3: 'rgba(0,0,0,0.16)',
  shadow4: 'rgba(0,0,0,0.24)',
  shadow5: 'rgba(0,0,0,0.32)',
  shadow6: 'rgba(0,0,0,0.4)',
}
const darkShadows = {
  shadow1: 'rgba(0,0,0,0.2)',
  shadow2: 'rgba(0,0,0,0.3)',
  shadow3: 'rgba(0,0,0,0.4)',
  shadow4: 'rgba(0,0,0,0.5)',
  shadow5: 'rgba(0,0,0,0.6)',
  shadow6: 'rgba(0,0,0,0.7)',
}

const builtThemes = createThemes({
  componentThemes: defaultComponentThemes,
  base: {
    palette: { dark: darkPalette, light: lightPalette },
    extra: {
      light: { ...Colors.green, ...Colors.red, ...Colors.yellow, ...lightShadows, shadowColor: lightShadows.shadow1 },
      dark: {
        ...Colors.greenDark,
        ...Colors.redDark,
        ...Colors.yellowDark,
        ...darkShadows,
        shadowColor: darkShadows.shadow1,
      },
    },
  },
  accent: {
    palette: {
      dark: [
        'hsla(250, 50%, 35%, 1)',
        'hsla(250, 50%, 38%, 1)',
        'hsla(250, 50%, 41%, 1)',
        'hsla(250, 50%, 43%, 1)',
        'hsla(250, 50%, 46%, 1)',
        'hsla(250, 50%, 49%, 1)',
        'hsla(250, 50%, 52%, 1)',
        'hsla(250, 50%, 54%, 1)',
        'hsla(250, 50%, 57%, 1)',
        'hsla(250, 50%, 60%, 1)',
        'hsla(250, 50%, 90%, 1)',
        'hsla(250, 50%, 95%, 1)',
      ],
      light: [
        'hsla(250, 50%, 40%, 1)',
        'hsla(250, 50%, 43%, 1)',
        'hsla(250, 50%, 46%, 1)',
        'hsla(250, 50%, 48%, 1)',
        'hsla(250, 50%, 51%, 1)',
        'hsla(250, 50%, 54%, 1)',
        'hsla(250, 50%, 57%, 1)',
        'hsla(250, 50%, 59%, 1)',
        'hsla(250, 50%, 62%, 1)',
        'hsla(250, 50%, 65%, 1)',
        'hsla(250, 50%, 95%, 1)',
        'hsla(250, 50%, 95%, 1)',
      ],
    },
  },
  childrenThemes: {
    warning: { palette: { dark: Object.values(Colors.yellowDark), light: Object.values(Colors.yellow) } },
    error: { palette: { dark: Object.values(Colors.redDark), light: Object.values(Colors.red) } },
    success: { palette: { dark: Object.values(Colors.greenDark), light: Object.values(Colors.green) } },
  },
})

/** Expose the generated themes directly. */
export const themes = builtThemes
export type ThemeName = keyof typeof themes

/** Optional; you can omit if you don’t care which is first. */
export const DEFAULT_THEME: ThemeName = 'light'

export const config = createTamagui({
  ...defaultConfig,
  tokens,
  themes,
  fonts,
  media,
  shorthands,
  defaultTheme: DEFAULT_THEME,
})

export type AppConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export type Config = typeof config
export default config

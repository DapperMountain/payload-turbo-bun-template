// Public API for app code. No direct "tamagui" imports outside this package.

import './tamagui.config'

export { withDesignSystem, type WithDesignSystemOptions } from './next-plugin'

export {
  DesignSystemProvider,
  DesignSystemTheme,
  DesignSystemThemeUnsafe,
} from './providers/react'

export { config, DEFAULT_THEME, type AppConfig, type ThemeName } from './tamagui.config'
export type { Config } from './tamagui.config'

export {
  Body,
  Button,
  Divider,
  H1,
  Label,
  PageTitle,
  Paragraph,
  Row,
  Separator,
  Stack,
  Text,
  XStack,
  YStack,
} from './primitives'

export type { StyledComponent } from './types'
export { asStyled } from './types'

export type * from 'tamagui'

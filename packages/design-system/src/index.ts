// Public API for app code. No direct "tamagui" imports appear outside this package.

// Next plugin
export { withDesignSystem, type WithDesignSystemOptions } from './next-plugin'

// Providers (type-safe + unsafe escape hatch)
export { DesignSystemProvider, DesignSystemTheme, DesignSystemThemeUnsafe } from './providers/react'

// Config + types
export { config, DEFAULT_THEME, type AppConfig, type ThemeName } from './tamagui.config'

export * from 'tamagui'
export type * from 'tamagui'

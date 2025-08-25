// Public API for app code. No direct "tamagui" imports appear outside this package.

// Next plugin
export { withDesignSystem, type WithDesignSystemOptions } from './next-plugin'

// Providers (type-safe + unsafe escape hatch)
export { NextDesignSystemProvider, NextDesignSystemThemeUnsafe } from './providers/next'
export { DesignSystemProvider, DesignSystemTheme, DesignSystemThemeUnsafe } from './providers/react'

// Config + types
export { config, DEFAULT_THEME, type ThemeName } from './tamagui.config'

// We intentionally forward all runtime exports and all type-only exports from Tamagui.
// Do not remove. This enables consumers to import types via the DS package.
//
export * from 'tamagui'
// eslint-disable import/no-unused-modules
export type * from 'tamagui'

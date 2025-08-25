'use client'

import React, { useMemo } from 'react'
import { TamaguiProvider, Theme } from 'tamagui'
// ⬇️ pull in the real default config value
import defaultConfig, { DEFAULT_THEME, type Config, type ThemeName } from '../tamagui.config'

/**
 * Type-safe provider:
 * - `themeName` must be a known ThemeName (keyof your themes) or null to skip wrapping.
 * - Falls back to the package’s default config when none is passed.
 */
export function DesignSystemProvider(props: {
  children: React.ReactNode
  themeName?: ThemeName | null
  config?: Config
}) {
  const { children, themeName = DEFAULT_THEME, config } = props

  // Use the provided config if present; otherwise, the library’s default.
  const cfg = useMemo(() => config ?? defaultConfig, [config])

  if (themeName == null) {
    return <TamaguiProvider config={cfg}>{children}</TamaguiProvider>
  }

  return (
    <TamaguiProvider config={cfg}>
      <Theme name={themeName}>{children}</Theme>
    </TamaguiProvider>
  )
}

/**
 * Escape hatch for dynamic / runtime-merged theme names.
 * Use only if you supply themes at runtime and the type system can’t know their keys.
 */
export function DesignSystemThemeUnsafe(props: { name: string; children: React.ReactNode }) {
  const { name, children } = props
  return <Theme name={name as unknown as ThemeName}>{children}</Theme>
}

// Re-export Theme for advanced use; prefer DesignSystemProvider above.
export const DesignSystemTheme = Theme

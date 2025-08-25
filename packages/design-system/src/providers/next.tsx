'use client'

import React, { useMemo } from 'react'
import { TamaguiProvider, Theme } from 'tamagui'
// ⬇️ import the actual default config value
import defaultConfig, { DEFAULT_THEME, type Config, type ThemeName } from '../tamagui.config'

export function NextDesignSystemProvider(props: {
  children: React.ReactNode
  themeName?: ThemeName | null
  config?: Config
}) {
  const { children, themeName = DEFAULT_THEME, config } = props

  // ⬇️ use the prop if provided, else fall back to the default export
  const cfg = useMemo(() => config ?? defaultConfig, [config])

  if (!cfg) {
    if (process.env.NODE_ENV !== 'production') {
      // Helpful dev-time assertion; remove if you prefer
      // eslint-disable-next-line no-console
      console.error('[DS] Tamagui config is undefined; did you forget the default export?')
    }
    // Early return prevents rendering a broken provider
    return <>{children}</>
  }

  if (themeName == null) {
    return <TamaguiProvider config={cfg}>{children}</TamaguiProvider>
  }

  return (
    <TamaguiProvider config={cfg}>
      <Theme name={themeName}>{children}</Theme>
    </TamaguiProvider>
  )
}

export function NextDesignSystemThemeUnsafe(props: { name: string; children: React.ReactNode }) {
  const { name, children } = props
  return <Theme name={name as unknown as ThemeName}>{children}</Theme>
}

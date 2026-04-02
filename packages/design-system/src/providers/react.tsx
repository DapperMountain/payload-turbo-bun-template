'use client'

import React, { useMemo } from 'react'
import { TamaguiProvider } from '@tamagui/core'
/** `Theme` is re-exported from the umbrella `tamagui` package; importing it from `@tamagui/core` fails under tamagui-build's TS pass. */
import { Theme } from 'tamagui'
import defaultConfig, { DEFAULT_THEME, type Config, type ThemeName } from '../tamagui.config'

/**
 * Tamagui shell for any React renderer (Next.js app router, Vite, etc.).
 *
 * - `themeName` must be a known `ThemeName` or `null` to skip the extra `Theme` wrapper.
 * - Uses the package default config when `config` is omitted.
 */
export function DesignSystemProvider(props: {
  children: React.ReactNode
  themeName?: ThemeName | null
  config?: Config
}) {
  const { children, themeName = DEFAULT_THEME, config } = props

  const cfg = useMemo(() => config ?? defaultConfig, [config])

  if (!cfg) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[DS] Tamagui config is undefined; did you forget the default export?')
    }
    return <>{children}</>
  }

  if (themeName == null) {
    return (
      <TamaguiProvider config={cfg} defaultTheme={DEFAULT_THEME} disableRootThemeClass>
        {children}
      </TamaguiProvider>
    )
  }

  return (
    <TamaguiProvider config={cfg} defaultTheme={DEFAULT_THEME} disableRootThemeClass>
      <Theme name={themeName}>{children}</Theme>
    </TamaguiProvider>
  )
}

/**
 * Escape hatch for dynamic / runtime-merged theme names when keys are not known to the type system.
 */
export function DesignSystemThemeUnsafe(props: { name: string; children: React.ReactNode }) {
  const { name, children } = props
  return <Theme name={name as unknown as ThemeName}>{children}</Theme>
}

/** Advanced: use `Theme` from the design-system package for custom composition. Prefer `DesignSystemProvider` when possible. */
export const DesignSystemTheme: typeof Theme = Theme

'use client'

import React, { useMemo } from 'react'

import defaultConfig, { type Config, type ThemeName } from '../tamagui.config'
import { DesignSystemProvider as DesignSystemProviderBase } from './react'
import { useDesignSystemServerInsertedStyles } from './use-server-inserted-styles'

export type { ThemeName, Config }

/**
 * Next.js App Router provider: {@link DesignSystemProviderBase} plus SSR style flush
 * (`useServerInsertedHTML` for react-native-web / Tamagui when supported).
 */
export function DesignSystemProvider(props: {
  children: React.ReactNode
  themeName?: ThemeName | null
  config?: Config
}) {
  const { children, themeName, config } = props
  const cfg = useMemo(() => config ?? defaultConfig, [config])

  useDesignSystemServerInsertedStyles(cfg)

  return (
    <DesignSystemProviderBase themeName={themeName} config={config}>
      {children}
    </DesignSystemProviderBase>
  )
}

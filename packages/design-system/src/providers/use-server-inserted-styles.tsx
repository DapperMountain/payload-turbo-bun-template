'use client'

import { useServerInsertedHTML } from 'next/navigation'
import React, { useRef } from 'react'
import { StyleSheet } from 'react-native'

import type { Config } from '../tamagui.config'

type StyleSheetWithSheet = typeof StyleSheet & {
  getSheet: () => { id: string; textContent: string }
}

/**
 * Flush react-native-web and Tamagui CSS during the App Router SSR pass.
 * @see https://tamagui.dev/docs/guides/next-js#app-layouttsx
 */
export function useDesignSystemServerInsertedStyles(config: Config | undefined) {
  const didFlushTamagui = useRef(false)

  useServerInsertedHTML(() => {
    const nodes: React.ReactNode[] = []

    const rnwStyle = (StyleSheet as StyleSheetWithSheet).getSheet()
    if (rnwStyle.textContent) {
      nodes.push(
        <style
          key={rnwStyle.id}
          dangerouslySetInnerHTML={{ __html: rnwStyle.textContent }}
          id={rnwStyle.id}
        />,
      )
    }

    if (config && !didFlushTamagui.current) {
      const getNewCSS = (config as { getNewCSS?: () => string }).getNewCSS
      if (typeof getNewCSS === 'function') {
        const css = getNewCSS()
        if (css) {
          nodes.push(<style key="tamagui-css" dangerouslySetInnerHTML={{ __html: css }} />)
        }
      }
      didFlushTamagui.current = true
    }

    if (nodes.length === 0) return null
    return <>{nodes}</>
  })
}

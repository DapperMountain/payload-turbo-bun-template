// packages/design-system/src/next-plugin.ts
import { withTamagui } from '@tamagui/next-plugin'
import fs from 'fs'
import type { NextConfig } from 'next'
import path from 'path'

export type WithDesignSystemOptions = {
  configPath?: string
  excludeReactNativeWebExports?: string[]
  disableExtraction?: boolean
  componentsExtra?: string[]
}

function resolveDefaultConfigPath(): string {
  const candidates = [
    path.join(__dirname, 'tamagui.config.js'),
    // dev/source fallback if someone runs from ts-node in a monorepo:
    path.join(__dirname, 'tamagui.config.ts'),
  ]
  for (const p of candidates) if (fs.existsSync(p)) return p
  throw new Error(
    [
      '[withDesignSystem] Could not locate a default tamagui.config next to the plugin.',
      `Checked:\n${candidates.map((c) => `  • ${c}`).join('\n')}`,
      'Pass options.configPath (absolute or app-root-relative) to withDesignSystem(...),',
      'or ensure your DS build emits dist/*/tamagui.config.js alongside next-plugin.',
    ].join('\n'),
  )
}

function resolveUserConfigPath(userPath: string): string {
  return path.isAbsolute(userPath) ? userPath : path.resolve(process.cwd(), userPath)
}

export function withDesignSystem(nextConfig: NextConfig = {}, options: WithDesignSystemOptions = {}): NextConfig {
  const finalConfigPath = options.configPath ? resolveUserConfigPath(options.configPath) : resolveDefaultConfigPath()

  if (!fs.existsSync(finalConfigPath)) {
    const cwd = process.cwd()
    throw new Error(
      [
        '[withDesignSystem] Tamagui config not found.',
        `  • cwd: ${cwd}`,
        `  • attempted: ${finalConfigPath}`,
        'Hint:',
        '  - If you passed options.configPath, make it absolute or app-root-relative.',
        '  - Otherwise, ensure your DS build outputs dist/*/tamagui.config.js next to next-plugin.',
      ].join('\n'),
    )
  }

  const plugin = withTamagui({
    appDir: true,
    components: ['tamagui', '@dappermountain/design-system', ...(options.componentsExtra ?? [])],
    config: finalConfigPath,
    disableExtraction: options.disableExtraction ?? false,
    ...(options.excludeReactNativeWebExports
      ? { excludeReactNativeWebExports: options.excludeReactNativeWebExports }
      : {}),
  })

  return plugin(nextConfig)
}

export default withDesignSystem

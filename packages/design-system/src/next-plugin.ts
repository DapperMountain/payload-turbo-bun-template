const { withTamagui } = require('@tamagui/next-plugin')
import fs from 'fs'
import type { NextConfig } from 'next'
import path from 'path'

export type WithDesignSystemOptions = {
  /** Override auto-detected built config (absolute or app-root-relative). */
  configPath?: string
  excludeReactNativeWebExports?: string[]
  disableExtraction?: boolean
  componentsExtra?: string[]
  /**
   * Emit theme/token CSS during `next build` (app-root-relative path).
   * Import the file in your App Router layout; pair with `disableInjectCSS` in production.
   * @see https://tamagui.dev/docs/guides/next-js#static-css-output
   */
  outputCSS?: string | null | false
}

function resolvePackageRoot(fromDir: string): string {
  const normalized = fromDir.replace(/\\/g, '/')
  if (normalized.includes('/dist/cjs') || normalized.includes('/dist/esm')) {
    return path.resolve(fromDir, '../..')
  }
  if (normalized.endsWith('/src')) {
    return path.resolve(fromDir, '..')
  }
  return path.resolve(fromDir, '..')
}

function resolveDefaultConfigPath(): string {
  const packageRoot = resolvePackageRoot(__dirname)
  const pluginDir = __dirname

  const candidates = [
    path.join(packageRoot, 'dist/esm/tamagui.config.mjs'),
    path.join(packageRoot, 'dist/esm/tamagui.config.js'),
    path.join(packageRoot, 'dist/cjs/tamagui.config.cjs'),
    path.join(packageRoot, 'dist/cjs/tamagui.config.js'),
    path.join(pluginDir, 'tamagui.config.mjs'),
    path.join(pluginDir, 'tamagui.config.js'),
    path.join(packageRoot, 'src/tamagui.config.ts'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  throw new Error(
    [
      '[withDesignSystem] Could not locate the design-system config.',
      `  • package root: ${packageRoot}`,
      `  • plugin dir: ${pluginDir}`,
      `Checked:\n${candidates.map((c) => `  • ${c}`).join('\n')}`,
      'Run `bun run build` in packages/design-system, or pass options.configPath to withDesignSystem(...).',
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
        '[withDesignSystem] Design-system config not found.',
        `  • cwd: ${cwd}`,
        `  • attempted: ${finalConfigPath}`,
        'Hint:',
        '  - If you passed options.configPath, make it absolute or app-root-relative.',
        '  - Otherwise, run `bun run build` in packages/design-system.',
      ].join('\n'),
    )
  }

  const outputCSS =
    options.outputCSS === undefined
      ? undefined
      : options.outputCSS === null || options.outputCSS === false
        ? options.outputCSS
        : resolveUserConfigPath(options.outputCSS)

  const plugin = withTamagui({
    appDir: true,
    components: ['tamagui', '@dappermountain/design-system', ...(options.componentsExtra ?? [])],
    config: finalConfigPath,
    disableExtraction: options.disableExtraction ?? false,
    ...(outputCSS !== undefined ? { outputCSS } : {}),
    ...(options.excludeReactNativeWebExports
      ? { excludeReactNativeWebExports: options.excludeReactNativeWebExports }
      : {}),
  })

  return plugin(nextConfig)
}

export default withDesignSystem

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const appDir = path.dirname(fileURLToPath(import.meta.url))
const designSystemDir = path.resolve(appDir, '../../packages/design-system')
const require = createRequire(import.meta.url)
const { withDesignSystem } = require(path.join(designSystemDir, 'dist/cjs/next-plugin.cjs')) as {
  withDesignSystem: (config: NextConfig, options: { configPath: string }) => NextConfig
}
const tamaguiConfigPath = path.join(designSystemDir, 'dist/esm/tamagui.config.mjs')
const reactResolved = require.resolve('react')

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(appDir, '../../'),
  reactCompiler: true,
  transpilePackages: ['@dappermountain/design-system'],
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  reactStrictMode: true,
  /** Tamagui build emits `import from "react.mjs"` under `moduleResolution: bundler`; map to the `react` package. */
  turbopack: {
    resolveAlias: {
      'react.mjs': 'react',
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...config.resolve.alias,
      'react.mjs': reactResolved,
    }
    return config
  },
}

export default withPayload(
  withDesignSystem(nextConfig, { configPath: tamaguiConfigPath }),
  {
    /**
     * Bundle Payload (and related server deps) in dev so Turbopack does not externalize `payload` as a
     * synthetic package (`payload-<hash>`), which Node cannot resolve at runtime.
     * @see https://payloadcms.com/docs/configuration/overview#withpayload-options
     */
    devBundleServerPackages: true,
  },
)

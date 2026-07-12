import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { withDesignSystem } = require('@dappermountain/design-system/next-plugin') as {
  withDesignSystem: (config: NextConfig, options?: { outputCSS?: string | null; disableExtraction?: boolean }) => NextConfig
}

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(appDir, '../../'),
  reactCompiler: true,
  transpilePackages: ['@dappermountain/design-system'],
  experimental: {
    turbopackFileSystemCacheForDev: true,
    turbopackServerFastRefresh: true,
  },
  reactStrictMode: true,
  /** Design-system build emits `import from "react.mjs"` under `moduleResolution: bundler`; map to the `react` package. */
  turbopack: {
    resolveAlias: {
      'react.mjs': 'react',
      'react-native': 'react-native-web',
    },
  },
}

export default withPayload(
  withDesignSystem(nextConfig, {
    disableExtraction: !isProd,
    outputCSS: isProd ? './public/tamagui.generated.css' : null,
  }),
  {
  /**
   * Bundle Payload (and related server deps) in dev so Turbopack does not externalize `payload` as a
   * synthetic package (`payload-<hash>`), which Node cannot resolve at runtime.
   * @see https://payloadcms.com/docs/configuration/overview#withpayload-options
   */
    devBundleServerPackages: true,
  },
)

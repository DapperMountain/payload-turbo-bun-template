import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(appDir, '../../'),
  reactCompiler: true,
  transpilePackages: ['@dappermountain/ui'],
  experimental: {
    turbopackFileSystemCacheForDev: true,
    turbopackServerFastRefresh: true,
  },
  reactStrictMode: true,
}

export default withPayload(nextConfig, {
  /**
   * Bundle Payload (and related server deps) in dev so Turbopack does not externalize `payload` as a
   * synthetic package (`payload-<hash>`), which Node cannot resolve at runtime.
   * @see https://payloadcms.com/docs/configuration/overview#withpayload-options
   */
  devBundleServerPackages: true,
})

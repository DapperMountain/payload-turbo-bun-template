import { withDesignSystem } from '@dappermountain/design-system'
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  experimental: {
    reactCompiler: true,
  },
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default withPayload(
  withDesignSystem(nextConfig, {
    disableExtraction: process.env.NODE_ENV === 'development',
  }),
)

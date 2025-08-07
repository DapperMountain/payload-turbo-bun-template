import { withPayload } from '@payloadcms/next/withPayload'
import { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  experimental: {
    reactCompiler: true,
  },
  reactStrictMode: true,
  transpilePackages: ['nativewind'],
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default withPayload(nextConfig)

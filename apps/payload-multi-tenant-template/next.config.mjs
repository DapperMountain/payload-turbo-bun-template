import { withPayload } from '@payloadcms/next/withPayload'
import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  reactCompiler: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  reactStrictMode: true,
  turbopack: {},
}

export default withPayload(nextConfig, {
  devBundleServerPackages: process.env.NODE_ENV !== 'development',
})

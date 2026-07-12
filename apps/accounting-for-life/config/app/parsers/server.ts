import { parseEnvBool, readEnv } from './helpers'

export type ServerConfig = {
  /** Browser-facing URL (`NEXT_PUBLIC_SERVER_URL`). */
  publicURL: string
  /** Payload/server absolute URL (`SERVER_URL`, else `publicURL`). */
  serverURL: string
  /** CORS allowlist (always includes `publicURL`). */
  corsOrigins: string[]
  /** Express `trust proxy` when behind Fly, nginx, etc. */
  trustProxy: boolean
}

/**
 * Comma-separated origins in `CORS_ORIGINS`, plus `publicURL` if missing.
 */
export function parseCorsOrigins(publicURL: string): string[] {
  const raw = readEnv('CORS_ORIGINS')

  if (!raw?.trim()) {
    return [publicURL]
  }

  const origins = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  return [...new Set([publicURL, ...origins])]
}

/** Public URL, server URL, CORS, and reverse-proxy trust. */
export function parseServerConfig(): ServerConfig {
  const publicURL = (readEnv('NEXT_PUBLIC_SERVER_URL') ?? '').trim()

  if (!publicURL) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SERVER_URL')
  }

  const serverURL = (readEnv('SERVER_URL') ?? '').trim() || publicURL
  const nodeEnv = readEnv('NODE_ENV') || 'development'

  return {
    publicURL,
    serverURL,
    corsOrigins: parseCorsOrigins(publicURL),
    trustProxy: parseEnvBool('TRUST_PROXY', nodeEnv === 'production'),
  }
}

import { readEnv } from './helpers'
import { parseSeedConfig, type SeedConfig } from './seed'

export type DatabaseSslMode = 'disable' | 'prefer' | 'require'

export type DatabaseConfig = {
  uri: string
  ssl: DatabaseSslMode
  poolMax: number
  seed: SeedConfig
}

function parseDatabaseSsl(): DatabaseSslMode {
  const raw = (readEnv('DATABASE_SSL') ?? 'disable').trim().toLowerCase()

  if (raw === '' || raw === 'disable') return 'disable'
  if (raw === 'prefer') return 'prefer'
  if (raw === 'require') return 'require'

  throw new Error(
    `Invalid DATABASE_SSL="${raw}". Use disable, prefer, or require.`,
  )
}

function parsePoolMax(): number {
  const raw = readEnv('DATABASE_POOL_MAX')

  if (raw === undefined || raw.trim() === '') {
    return 10
  }

  const value = Number.parseInt(raw, 10)

  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`Invalid DATABASE_POOL_MAX="${raw}" (expected a positive integer)`)
  }

  return value
}

/**
 * Database connection settings. Uses `DATABASE_URL_TEST` when `NODE_ENV=test` if set.
 */
export function parseDatabaseConfig(): DatabaseConfig {
  const nodeEnv = readEnv('NODE_ENV') || 'development'
  let uri: string

  if (nodeEnv === 'test') {
    uri = (readEnv('DATABASE_URL_TEST') ?? readEnv('DATABASE_URL') ?? '').trim()

    if (!uri) {
      throw new Error(
        'When NODE_ENV=test, set DATABASE_URL_TEST (recommended) or DATABASE_URL.',
      )
    }
  } else {
    uri = (readEnv('DATABASE_URL') ?? '').trim()

    if (!uri) {
      throw new Error('Missing required environment variable: DATABASE_URL')
    }
  }

  return {
    uri,
    ssl: parseDatabaseSsl(),
    poolMax: parsePoolMax(),
    seed: parseSeedConfig(),
  }
}

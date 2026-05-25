import type { DatabaseConfig, DatabaseSslMode } from '../app/parsers/database'
import { parseEnvBool } from '../app/parsers/helpers'

type PgPoolOptions = {
  connectionString: string
  max: number
  ssl?: boolean | { rejectUnauthorized: boolean }
}

/**
 * Maps {@link DatabaseConfig} to `pg` pool options for `@payloadcms/db-postgres`.
 */
export function postgresPoolOptions(database: DatabaseConfig): PgPoolOptions {
  const options: PgPoolOptions = {
    connectionString: database.uri,
    max: database.poolMax,
  }

  const ssl = sslForMode(database.ssl)

  if (ssl !== undefined) {
    options.ssl = ssl
  }

  return options
}

function sslForMode(mode: DatabaseSslMode): PgPoolOptions['ssl'] {
  switch (mode) {
    case 'disable':
      return undefined
    case 'prefer':
      return { rejectUnauthorized: false }
    case 'require':
      return {
        rejectUnauthorized: parseEnvBool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
      }
  }
}

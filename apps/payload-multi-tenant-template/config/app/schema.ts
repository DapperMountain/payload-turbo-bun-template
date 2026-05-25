import { z } from 'zod'

import { parseDatabaseConfig, type DatabaseConfig } from './parsers/database'
import { boolEnv, enumEnv, requiredEnv } from './parsers/helpers'
import { parseServerConfig, type ServerConfig } from './parsers/server'

/**
 * Environment-backed app settings.
 *
 * See `config/README.md` for the variable list and `.env.example` for local defaults.
 */
export const appConfigSchema = z.object({
  /** `NODE_ENV` — guards test DB teardown and similar behavior. */
  env: enumEnv('NODE_ENV', ['development', 'test', 'production'], 'development'),

  server: z.custom<ServerConfig>().default(parseServerConfig),

  database: z.custom<DatabaseConfig>().default(parseDatabaseConfig),

  payload: z
    .object({
      /** Signing / encryption secret (`PAYLOAD_SECRET`). */
      secret: requiredEnv('PAYLOAD_SECRET'),
    })
    .prefault({}),

  features: z
    .object({
      /** Payload anonymous telemetry (`PAYLOAD_TELEMETRY_ENABLED`). */
      telemetry: boolEnv('PAYLOAD_TELEMETRY_ENABLED', false),
      /** GraphQL API + schema generation (`GRAPHQL_ENABLED`). */
      graphql: boolEnv('GRAPHQL_ENABLED', true),
      /** MCP server at `/api/mcp` (`MCP_ENABLED`). */
      mcp: boolEnv('MCP_ENABLED', true),
    })
    .prefault({}),
})

export type AppConfig = z.infer<typeof appConfigSchema>

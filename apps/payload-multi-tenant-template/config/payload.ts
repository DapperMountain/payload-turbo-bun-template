import { postgresAdapter } from '@payloadcms/db-postgres'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { migrations } from '@/database/migrations'

import collections, { Users } from '@/collections'
import { seed } from '@/database/seed'
import endpoints from '@/endpoints'
import { i18n, localization } from '@/lang'
import type { Config } from '@/types'
import { userIsSystemAdmin } from '@/utils'

import config from '@config'

import { postgresPoolOptions } from './adapters/postgres-pool'

const filename = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(filename), '..')

export default buildConfig({
  serverURL: config.server.serverURL,
  admin: { user: Users.slug, suppressHydrationWarning: true },
  collections,
  endpoints,
  i18n,
  localization,
  editor: lexicalEditor({}),
  secret: config.payload.secret,
  typescript: { outputFile: path.resolve(rootDir, 'src', 'types.ts') },
  ...(config.features.graphql ? { graphQL: { schemaOutputFile: path.resolve(rootDir, 'src', 'schema.graphql') } } : {}),
  db: postgresAdapter({
    idType: 'uuidv7',
    migrationDir: path.resolve(rootDir, 'src', 'database', 'migrations'),
    prodMigrations: migrations,
    pool: postgresPoolOptions(config.database),
  }),
  onInit(payload) {
    seed(payload)
  },
  cors: config.server.corsOrigins,
  csrf: config.server.corsOrigins,
  plugins: [
    multiTenantPlugin<Config>({
      collections: {},
      tenantsSlug: 'tenants',
      tenantsArrayField: { includeDefaultField: false },
      userHasAccessToAllTenants: (user) => userIsSystemAdmin(user),
    }),
  ],
  telemetry: config.features.telemetry,
})

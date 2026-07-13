import { postgresAdapter } from '@payloadcms/db-postgres'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { migrations } from '@/database/migrations'

import collections, { Budgets, Categories, CategoryGroups, Users, Workspaces } from '@/collections'
import { seed } from '@/database/seed'
import endpoints from '@/endpoints'
import { i18n, localization } from '@/lang'
import type { Config } from '@/types'
import { isAppUser, userIsSystemAdmin } from '@/utils'

import config from '@config'

import { postgresPoolOptions } from './adapters/postgres-pool'

const filename = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(filename), '..')

export default buildConfig({
  serverURL: config.server.serverURL,
  admin: { user: Users.slug, suppressHydrationWarning: true },
  bin: [
    {
      key: 'seed',
      scriptPath: path.resolve(rootDir, 'src', 'database', 'seed', 'run.ts'),
    },
    {
      key: 'push-schema',
      scriptPath: path.resolve(rootDir, 'src', 'database', 'push-schema.ts'),
    },
  ],
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
      collections: {
        [Budgets.slug]: {},
        [CategoryGroups.slug]: {},
        [Categories.slug]: {},
      },
      tenantsSlug: 'workspaces',
      tenantField: { name: 'workspace' },
      tenantsArrayField: {
        includeDefaultField: false,
        arrayFieldName: 'workspaces',
        arrayTenantFieldName: 'workspace',
      },
      tenantSelectorLabel: 'Workspace',
      userHasAccessToAllTenants: (user) => isAppUser(user) && userIsSystemAdmin(user),
    }),
    mcpPlugin({
      disabled: !config.features.mcp,
      userCollection: Users.slug as 'users',
      collections: {
        [Users.slug]: {
          enabled: true,
          description: 'Application users and workspace memberships.',
        },
        [Workspaces.slug]: {
          enabled: true,
          description: 'Household workspaces.',
        },
        [Budgets.slug]: {
          enabled: true,
          description: 'Household budgets with category groups and envelopes.',
        },
        [CategoryGroups.slug]: {
          enabled: true,
          description: 'Category groups within a budget (Income, Fixed, …).',
        },
        [Categories.slug]: {
          enabled: true,
          description: 'Budget categories for income and spending.',
        },
      },
      mcp: {
        serverOptions: {
          serverInfo: {
            name: 'accounting-for-life',
            version: '0.1.0',
          },
        },
      },
    }),
  ],
  telemetry: config.features.telemetry,
})

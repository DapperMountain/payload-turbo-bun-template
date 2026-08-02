import { postgresAdapter } from '@payloadcms/db-postgres'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { migrations } from '@/database/migrations'

import collections, {
  Accounts,
  Budgets,
  Categories,
  CategoryGroups,
  EnvelopeBalances,
  TransactionEntries,
  Transactions,
  Units,
  Users,
  Workspaces,
} from '@/collections'
import { seed } from '@/database/seed'
import endpoints from '@/endpoints'
import { custom, i18n, localization } from '@/lang'
import type { Config } from '@/types'
import { isAppUser, userIsSystemAdmin } from '@/utils'

import config from '@config'

import { postgresPoolOptions } from './adapters/postgres-pool'

const filename = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(filename), '..')

export default buildConfig({
  serverURL: config.server.serverURL,
  admin: {
    user: Users.slug,
    autoRefresh: true,
    suppressHydrationWarning: true,
  },
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
    ...(process.env.PAYLOAD_DISABLE_DEV_PUSH === 'true' ? { push: false } : {}),
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
        [EnvelopeBalances.slug]: {},
        [Units.slug]: {},
        [Accounts.slug]: {},
        [Transactions.slug]: {},
        [TransactionEntries.slug]: {},
      },
      tenantsSlug: 'workspaces',
      tenantField: { name: 'workspace' },
      tenantsArrayField: {
        includeDefaultField: false,
        arrayFieldName: 'workspaces',
        arrayTenantFieldName: 'workspace',
      },
      tenantSelectorLabel: custom.tenantSelector.label,
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
        [EnvelopeBalances.slug]: {
          enabled: true,
          description: 'Monthly assigned amounts per category envelope.',
        },
        [Units.slug]: {
          enabled: true,
          description: 'Currency and commodity units for accounts and journal lines.',
        },
        [Accounts.slug]: {
          enabled: true,
          description: 'Asset, liability, and other accounts within a budget.',
        },
        [Transactions.slug]: {
          enabled: true,
          description: 'Posted and pending transactions (money movement headers).',
        },
        [TransactionEntries.slug]: {
          enabled: true,
          description: 'Transaction legs (written via transactions create hook).',
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

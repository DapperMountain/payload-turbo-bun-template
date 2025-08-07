import { postgresAdapter } from '@payloadcms/db-postgres'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { AccessArgs, buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { migrations } from '@/database/migrations'

import collections from '@/collections'
import endpoints from '@/endpoints'
import { i18n, localization } from '@/lang'

import { isSystemAdmin } from '@/access/roles/isSystemAdmin'
import Users from '@/collections/Users'
import { seed } from '@/database/seed'
import config, { Config } from '@config'

const filename = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(filename), '..')

export default buildConfig({
  admin: { user: Users.slug },
  collections,
  endpoints,
  i18n,
  localization,
  editor: lexicalEditor({}),
  secret: config.payload.secret,
  typescript: { outputFile: path.resolve(rootDir, 'src', 'types.ts') },
  graphQL: { schemaOutputFile: path.resolve(rootDir, 'src', 'schema.graphql') },
  db: postgresAdapter({
    idType: 'uuid',
    migrationDir: path.resolve(rootDir, 'src', 'database', 'migrations'),
    prodMigrations: migrations, // run migrations on init
    pool: { connectionString: config.database.uri },
  }),
  onInit(payload) {
    seed(payload)
  },
  cors: [config.baseURL].filter(Boolean),
  plugins: [
    multiTenantPlugin<Config>({
      collections: {},
      tenantsSlug: 'tenants',
      tenantsArrayField: { includeDefaultField: false },
      userHasAccessToAllTenants: (user) => Boolean(isSystemAdmin({ req: { user } } as AccessArgs)),
    }),
  ],
  telemetry: false,
})

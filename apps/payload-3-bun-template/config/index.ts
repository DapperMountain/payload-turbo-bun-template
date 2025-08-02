import { z } from 'zod'

// Helper function for environment string values with defaults
const envString = (
  envVar: string | undefined,
  defaultValue: string = '',
  extraValidation?: (schema: z.ZodString) => z.ZodString,
) => {
  let schema = z.string()
  const value = envVar ?? defaultValue
  if (value && extraValidation) {
    schema = extraValidation(schema)
  }
  return schema.default(value)
}

const configSchema = z.object({
  env: z.enum(['development', 'production', 'test']).default(process.env.NODE_ENV ?? 'development'),

  baseURL: envString(process.env.NEXT_PUBLIC_SERVER_URL, '', (schema) => schema.url()),

  database: z
    .object({
      uri: envString(process.env.DATABASE_URL, '', (schema) => schema.url()),
      seed: z
        .object({
          enabled: z.coerce.boolean().default(process.env.DATA_SEED_ENABLED === '1'),
          admin: z
            .object({
              email: envString(process.env.DATA_SEED_ADMIN_EMAIL),
              firstName: envString(process.env.DATA_SEED_ADMIN_FIRST_NAME),
              lastName: envString(process.env.DATA_SEED_ADMIN_LAST_NAME),
              password: envString(process.env.DATA_SEED_ADMIN_PASSWORD),
            })
            .default({}),
          user: z
            .object({
              email: envString(process.env.DATA_SEED_USER_EMAIL),
              firstName: envString(process.env.DATA_SEED_USER_FIRST_NAME),
              lastName: envString(process.env.DATA_SEED_USER_LAST_NAME),
              password: envString(process.env.DATA_SEED_USER_PASSWORD),
            })
            .default({}),
        })
        .default({}),
    })
    .default({}),

  payload: z.object({ secret: envString(process.env.PAYLOAD_SECRET, '', (schema) => schema.min(1)) }).default({}),

  roles: z
    .object({
      system: z
        .object({
          admin: z
            .object({ name: envString(undefined, 'Admin'), description: envString(undefined, 'System Admin') })
            .default({}),
          user: z
            .object({ name: envString(undefined, 'User'), description: envString(undefined, 'System User') })
            .default({}),
        })
        .default({}),
      tenant: z
        .object({
          admin: z
            .object({ name: envString(undefined, 'Admin'), description: envString(undefined, 'Tenant Admin') })
            .default({}),
          user: z
            .object({ name: envString(undefined, 'User'), description: envString(undefined, 'Tenant User') })
            .default({}),
        })
        .default({}),
    })
    .default({}),

  tenants: z
    .object({
      default: z
        .object({ name: envString(undefined, 'Default'), description: envString(undefined, 'Default tenant') })
        .default({}),
    })
    .default({}),
})

export type Config = z.infer<typeof configSchema>
const config: Config = configSchema.parse({})
export default config

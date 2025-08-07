import { z } from 'zod'

const env = process.env

// === Reusable Helpers ===

/**
 * Loads an environment variable as a non-empty string.
 * Throws if missing or empty.
 *
 * @param key - Environment variable name
 * @returns Zod string schema with a default and non-empty refinement
 */
const zEnv = (key: string) =>
  z
    .string()
    .default(env[key] ?? '')
    .refine((val) => val.length > 0, { message: `Missing required env var: ${key}` })
    .describe(`Environment variable: ${key}`)

/**
 * Creates a Zod object schema with z.literal values for every key in the object.
 * Enforces strict constant values and uses prefault to default to the object itself.
 *
 * @param obj - Record of string/number/boolean literals
 * @returns Zod object schema with literal constraints
 */
const zLiteralObject = <T extends Record<string, string | number | boolean>>(obj: T) => {
  const shape = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, z.literal(v).describe(`Must equal: ${v}`)]),
  ) as { [K in keyof T]: z.ZodLiteral<T[K]> }

  const schema = z.object(shape).describe('Literal object with fixed constant values')

  // Ensure we return the input type (not output)
  return schema.prefault(() => obj as z.input<typeof schema>)
}

/**
 * Loads an environment variable and validates it as a proper email address.
 *
 * @param key - Environment variable name
 * @returns Zod email string schema with default
 */
const zEmailEnv = (key: string) =>
  z
    .email(`Invalid email for ${key}`)
    .default(env[key] ?? '')
    .describe(`Environment variable (email): ${key}`)

/**
 * Loads an environment variable and parses it as a boolean.
 * Interprets the string 'true' as true, anything else as false.
 *
 * @param key - Environment variable name
 * @returns Zod schema that resolves to a boolean
 */
const zBoolEnv = (key: string) =>
  z
    .string()
    .default(env[key] ?? 'false')
    .transform((v) => v === 'true')
    .describe(`Environment variable (boolean): ${key}`)

/**
 * Loads a string from an environment variable and ensures it's one of a predefined enum.
 *
 * @param key - Environment variable name
 * @param options - Allowed enum string values
 * @param fallback - Fallback value if env var is undefined
 * @returns Zod enum schema with default
 */
const zEnumEnv = <T extends [string, ...string[]]>(key: string, options: T, fallback: T[number]) =>
  z
    .enum(options)
    .default((env[key] as T[number]) ?? fallback)
    .describe(`Environment variable (enum): ${key}`)

// === Shared Nested Object Builder ===

/**
 * Builds a reusable schema for a seed user (admin/user) with env-prefixed keys.
 *
 * @param prefix - Prefix used in env vars, e.g., "DATA_SEED_ADMIN"
 * @returns Zod object schema with all fields defaulted from env
 */
const zUserSeed = (prefix: string) =>
  z
    .object({
      email: zEmailEnv(`${prefix}_EMAIL`),
      firstName: zEnv(`${prefix}_FIRST_NAME`),
      lastName: zEnv(`${prefix}_LAST_NAME`),
      password: zEnv(`${prefix}_PASSWORD`),
    })
    .prefault({})
    .describe(`User seed config from env prefix: ${prefix}`)

// === Config Schema (Self-contained, DRY) ===

/**
 * Full application config schema.
 * Combines dynamic env-based values with static literal roles and defaults.
 */
const configSchema = z
  .object({
    env: zEnumEnv('NODE_ENV', ['development', 'test', 'production'], 'development').describe(
      'Application environment mode',
    ),

    baseURL: zEnv('NEXT_PUBLIC_SERVER_URL').describe('Public-facing base URL'),

    /** Database and seed user configuration */
    database: z
      .object({
        uri: zEnv('DATABASE_URL').describe('PostgreSQL connection string'),

        seed: z
          .object({
            enabled: zBoolEnv('DATA_SEED_ENABLED').describe('Enable data seeding on init'),
            admin: zUserSeed('DATA_SEED_ADMIN').describe('Admin seed user'),
            user: zUserSeed('DATA_SEED_USER').describe('Regular seed user'),
          })
          .prefault({})
          .describe('Data seed configuration'),
      })
      .prefault({})
      .describe('Database configuration'),

    /** PayloadCMS secret for session signing/encryption */
    payload: z
      .object({
        secret: zEnv('PAYLOAD_SECRET').describe('PayloadCMS signing/encryption secret'),
      })
      .prefault({})
      .describe('PayloadCMS configuration'),

    /** Role name and description mappings (system + tenant) */
    roles: z
      .object({
        system: z
          .object({
            admin: zLiteralObject({
              name: 'Admin',
              description: 'System Admin',
            }).describe('System admin role'),

            user: zLiteralObject({
              name: 'User',
              description: 'System User',
            }).describe('System user role'),
          })
          .prefault(() => ({}))
          .describe('System roles'),

        tenant: z
          .object({
            admin: zLiteralObject({
              name: 'Admin',
              description: 'Tenant Admin',
            }).describe('Tenant admin role'),

            user: zLiteralObject({
              name: 'User',
              description: 'Tenant User',
            }).describe('Tenant user role'),
          })
          .prefault(() => ({}))
          .describe('Tenant roles'),
      })
      .prefault(() => ({}))
      .describe('Application roles configuration'),

    /** Default tenant role */
    tenants: z
      .object({
        default: zLiteralObject({
          name: 'Default',
          description: 'Default Tenant',
        }).describe('Default tenant role'),
      })
      .prefault(() => ({}))
      .describe('Default tenant mapping'),
  })
  .describe('Application configuration schema')

/** Type-safe config object derived from config schema */
export type Config = z.infer<typeof configSchema>

/** Parsed and validated application config */
const config: Config = configSchema.parse({})

export default config

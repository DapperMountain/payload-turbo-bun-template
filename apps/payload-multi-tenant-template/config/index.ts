/**
 * Central Zod schema for app config. Call `configSchema.parse({})` so every field resolves
 * defaults from `process.env` at parse time (Zod 4 `prefault` / defaults on nested objects).
 *
 * Helpers below build small reusable env readers. They read `process.env[key]` inside
 * `.default(...)` so the same schema works in Node (Payload, Next config) without a separate loader.
 */
import { app } from '@/lang/en'
import { z } from 'zod'

const env = process.env

// === Reusable helpers ===

/**
 * Required string from `process.env[key]`.
 *
 * Defaults to the current env value (or `''`), then fails `.refine` if the result is empty,
 * so missing or blank vars produce a clear error at `parse` time.
 *
 * @param key - Environment variable name (e.g. `DATABASE_URL`)
 */
const zEnv = (key: string) =>
  z
    .string()
    .default(env[key] ?? '')
    .refine((val) => val.length > 0, { message: `Missing required env var: ${key}` })
    .describe(`Environment variable: ${key}`)

/**
 * Fixed `{ ... }` object whose properties must match the given literals exactly.
 *
 * Used for display strings sourced from `@/lang/en` `app` so `parse({})` prefaults match product copy.
 *
 * @param obj - Record of primitive literals
 * @returns Object schema with one `z.literal` per key, prefaulted to `obj`
 */
const zLiteralObject = <T extends Record<string, string | number | boolean>>(obj: T) => {
  const shape = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, z.literal(v).describe(`Must equal: ${v}`)]),
  ) as { [K in keyof T]: z.ZodLiteral<T[K]> }

  const schema = z.object(shape).describe('Literal object with fixed constant values')

  return schema.prefault(() => obj as z.input<typeof schema>)
}

/**
 * Email string from `process.env[key]`, validated with Zod’s email check.
 *
 * @param key - Environment variable name
 */
const zEmailEnv = (key: string) =>
  z
    .email(`Invalid email for ${key}`)
    .default(env[key] ?? '')
    .describe(`Environment variable (email): ${key}`)

/**
 * Boolean from `process.env[key]` as a string.
 *
 * Accepts (case-insensitive): `true`, `1`, `false`, `0`. Defaults the raw string to
 * `'false'` when unset, so omitted vars become `false` after transform.
 *
 * @param key - Environment variable name
 */
const zBoolEnv = (key: string) =>
  z
    .string()
    .default(env[key] ?? 'false')
    .transform((v) => {
      const val = v.trim().toLowerCase()

      if (['true', '1'].includes(val)) return true
      if (['false', '0'].includes(val)) return false
    })
    .describe(`Environment variable (boolean): ${key}`)

/**
 * String union (enum) from `process.env[key]`, constrained to `options`.
 *
 * @param key - Environment variable name
 * @param options - Tuple of allowed strings (Zod `z.enum` requires a non-empty tuple type)
 * @param fallback - Used when `env[key]` is undefined (e.g. default `NODE_ENV` for local dev)
 */
const zEnumEnv = <T extends [string, ...string[]]>(key: string, options: T, fallback: T[number]) =>
  z
    .enum(options)
    .default((env[key] as T[number]) ?? fallback)
    .describe(`Environment variable (enum): ${key}`)

/**
 * One seed user (email, name, password) loaded from env vars sharing a prefix.
 *
 * Expects: `{prefix}_EMAIL`, `{prefix}_FIRST_NAME`, `{prefix}_LAST_NAME`, `{prefix}_PASSWORD`.
 * Example prefix: `DATA_SEED_ADMIN` → `DATA_SEED_ADMIN_EMAIL`, etc.
 *
 * @param prefix - Uppercase env prefix without trailing underscore
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

// === Config schema ===

/** Top-level `parse({})` schema: env-backed settings plus fixed role/tenant literals from `app`. */
const configSchema = z
  .object({
    env: zEnumEnv('NODE_ENV', ['development', 'test', 'production'], 'development').describe(
      'Application environment mode',
    ),

    baseURL: zEnv('NEXT_PUBLIC_SERVER_URL').describe('Public-facing base URL'),

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

    payload: z
      .object({
        secret: zEnv('PAYLOAD_SECRET').describe('PayloadCMS signing/encryption secret'),
      })
      .prefault({})
      .describe('PayloadCMS configuration'),

    roles: zLiteralObject(app.roles).describe('Role labels (canonical English; see `@/lang/en`)'),

    tenants: z
      .object({
        default: z
          .literal(app.defaultTenant)
          .describe(`Must equal: ${app.defaultTenant}`)
          .prefault(() => app.defaultTenant),
      })
      .prefault(() => ({}))
      .describe('Default tenant display label'),
  })
  .describe('Application configuration schema')

/** Inferred shape of `configSchema` (fully typed after `parse`). */
export type Config = z.infer<typeof configSchema>

/** Parsed config; read this at module load in server code. */
const config: Config = configSchema.parse({})

export default config

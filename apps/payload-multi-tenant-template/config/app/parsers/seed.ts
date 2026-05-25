import { z } from 'zod'

import { parseEnvBool, readEnv, requiredEmailEnv, requiredEnv } from './helpers'

export const seedUserSchema = (prefix: string) =>
  z.object({
    email: requiredEmailEnv(`${prefix}_EMAIL`),
    firstName: requiredEnv(`${prefix}_FIRST_NAME`),
    lastName: requiredEnv(`${prefix}_LAST_NAME`),
    password: requiredEnv(`${prefix}_PASSWORD`),
  })

export type SeedUser = z.infer<ReturnType<typeof seedUserSchema>>

export type SeedConfig =
  | { enabled: false }
  | { enabled: true; admin: SeedUser; user: SeedUser }

/**
 * Seed settings from env. When `DATA_SEED_ENABLED` is false, admin/user vars are not read.
 *
 * Always disabled when `NODE_ENV=test` (integration tests create their own data).
 */
export function parseSeedConfig(): SeedConfig {
  if (readEnv('NODE_ENV') === 'test') {
    return { enabled: false }
  }

  const enabled = parseEnvBool('DATA_SEED_ENABLED', false)

  if (!enabled) {
    return { enabled: false }
  }

  return {
    enabled: true,
    admin: seedUserSchema('DATA_SEED_ADMIN').parse({}),
    user: seedUserSchema('DATA_SEED_USER').parse({}),
  }
}

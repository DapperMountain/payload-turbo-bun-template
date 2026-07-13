import type { User } from '@/types'
import config from '@config'
import type { Payload } from 'payload'

import { seedUserSchema, type SeedUser } from '../../../../config/app/parsers/seed'

import type { SeedRunOptions } from '../types'

/** Reads `DATA_SEED_ADMIN_*` and `DATA_SEED_USER_*` from the environment. */
function loadSeedUsersFromEnv(): { admin: SeedUser; user: SeedUser } {
  return {
    admin: seedUserSchema('DATA_SEED_ADMIN').parse({}),
    user: seedUserSchema('DATA_SEED_USER').parse({}),
  }
}

function resolveSeedUsers(
  payload: Payload,
  options?: SeedRunOptions,
): { admin: SeedUser; user: SeedUser } | null {
  if (config.database.seed.enabled) {
    return config.database.seed
  }

  if (!options?.force) {
    return null
  }

  try {
    return loadSeedUsersFromEnv()
  } catch {
    payload.logger.error(
      '❌ [Users] Set DATA_SEED_ADMIN_* and DATA_SEED_USER_* in .env (see .env.example), then run `bun run db:seed users`.',
    )
    return null
  }
}

/**
 * Seeds default admin and system user accounts from `config.database.seed`.
 *
 * Skips emails that already exist. Uses `overrideAccess: true` because seeding runs
 * before role-based access is fully established.
 *
 * @param payload - Initialized Payload instance.
 * @param options - Pass `{ force: true }` from `db:seed` to read credentials from env when onInit seed is off.
 */
export async function seedUsers(payload: Payload, options?: SeedRunOptions): Promise<void> {
  const credentials = resolveSeedUsers(payload, options)

  if (!credentials) {
    return
  }

  const { admin, user } = credentials

  const users: Partial<User>[] = [
    {
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      password: admin.password,
      roles: ['SYSTEM_ADMIN'],
    },
    {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: user.password,
      roles: ['SYSTEM_USER'],
    },
  ]

  for (const seedUser of users) {
    try {
      const exists = (
        await payload.find({
          collection: 'users',
          pagination: false,
          where: { email: { equals: seedUser.email } },
          locale: 'all',
          overrideAccess: true,
        })
      )?.totalDocs

      if (exists) {
        payload.logger.warn(`🚨 [Users] User with email "${seedUser.email}" already exists, skipping.`)
        continue
      }

      await payload.create({
        collection: 'users',
        data: seedUser as User,
        overrideAccess: true,
      })

      payload.logger.info(`✅ [Users] User "${seedUser.email}" inserted successfully.`)
    } catch (error) {
      payload.logger.error(
        `❌ [Users] Failed to insert user "${seedUser.email}": ${
          error instanceof Error ? error.message : 'Unknown error occurred.'
        }`,
      )
    }
  }
}

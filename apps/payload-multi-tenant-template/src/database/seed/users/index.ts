import type { User } from '@/types'
import config from '@config'
import type { Payload } from 'payload'

/**
 * Seeds default admin and system user accounts from `config.database.seed`.
 *
 * Skips emails that already exist. Uses `overrideAccess: true` because seeding runs
 * before role-based access is fully established.
 *
 * @param payload - Initialized Payload instance.
 */
export async function seedUsers(payload: Payload): Promise<void> {
  const seed = config.database.seed

  if (!seed.enabled) {
    return
  }

  const { admin, user } = seed

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

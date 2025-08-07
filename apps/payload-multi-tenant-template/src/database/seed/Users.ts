import type { User } from '@/types'
import config from '@config'
import { Payload } from 'payload'

/**
 * Seeds users into the database if they don't already exist.
 *
 * Defines an array of users to seed, checks if any users with the specified emails already exist,
 * logs a message if they do, and skips the creation.
 *
 * @param {Payload} payload - The Payload instance.
 * @returns {Promise<void>} A promise that resolves when the seeding is complete.
 */
export default async function seed(payload: Payload): Promise<void> {
  const { admin, user } = config.database.seed

  const users: Partial<User>[] = [
    { email: admin.email, firstName: 'System', lastName: 'Admin', password: admin.password, roles: ['SYSTEM_ADMIN'] },
    { email: user.email, firstName: 'System', lastName: 'User', password: user.password, roles: ['SYSTEM_USER'] },
  ]

  for (const user of users) {
    try {
      // Check if the user already exists
      const exists = (
        await payload.find({
          collection: 'users',
          pagination: false,
          where: { email: { equals: user.email } },
          locale: 'all',
          overrideAccess: true,
        })
      )?.totalDocs

      if (exists) {
        payload.logger.warn(`🚨 [Users] User with email "${user.email}" already exists, skipping.`)
        continue
      }

      // Create the user if they don't exist
      await payload.create({ collection: 'users', data: user as User, overrideAccess: true })

      payload.logger.info(`✅ [Users] User "${user.email}" inserted successfully.`)
    } catch (error) {
      payload.logger.error(
        `❌ [Users] Failed to insert user "${user.email}": ${
          error instanceof Error ? error.message : 'Unknown error occurred.'
        }`,
      )
    }
  }
}

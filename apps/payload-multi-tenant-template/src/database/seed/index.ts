import config from '@config'
import { Payload } from 'payload'
import addUsers from './Users.ts'

/**
 * Seeds the database, in order
 */
export async function seed(payload: Payload): Promise<void> {
  const seeders = [{ name: 'Users', seedFunction: addUsers }]

  for (const { name, seedFunction } of seeders) {
    // Skip if database seeding is disabled
    if (!config.database.seed.enabled) {
      return
    }

    try {
      payload.logger.info(`🌱 [${name}] Attempting to seed data.`)
      await seedFunction(payload)
      payload.logger.info(`✅ [${name}] Seeding complete.`)
    } catch (error) {
      payload.logger.error(
        `❌ [${name}] Seeding failed: ${error instanceof Error ? error.message : 'Unknown error occurred.'}`,
      )
    }
  }
}

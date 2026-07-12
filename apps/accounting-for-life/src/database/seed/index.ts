import config from '@config'
import type { Payload } from 'payload'

import { seedUsers } from './users'

/**
 * Runs database seeders when `config.database.seed.enabled` is true.
 *
 * Called from `onInit` in `config/payload.ts`. Add seeders to the `seeders` array.
 *
 * @param payload - Initialized Payload instance.
 */
export async function seed(payload: Payload): Promise<void> {
  const seeders = [{ name: 'Users', seedFunction: seedUsers }]

  for (const { name, seedFunction } of seeders) {
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

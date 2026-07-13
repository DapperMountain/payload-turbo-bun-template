import config from '@config'
import type { Payload } from 'payload'

import { seedBudgets } from './budgets'
import { seedLedger } from './ledger'
import { seedUsers } from './users'
import { seedWorkspaces } from './workspaces'

/**
 * Runs database seeders when `config.database.seed.enabled` is true.
 *
 * Called from `onInit` in `config/payload.ts`. Add seeders to the `seeders` array.
 *
 * Order: users → workspaces → budgets (categories via hook) → ledger (units, accounts, sample transfer).
 *
 * @param payload - Initialized Payload instance.
 */
export async function seed(payload: Payload): Promise<void> {
  if (process.env.PAYLOAD_DISABLE_ON_INIT_SEED === '1') {
    return
  }

  const seeders = [
    { name: 'Users', seedFunction: seedUsers },
    { name: 'Workspaces', seedFunction: seedWorkspaces },
    { name: 'Budgets', seedFunction: seedBudgets },
    { name: 'Ledger', seedFunction: seedLedger },
  ]

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

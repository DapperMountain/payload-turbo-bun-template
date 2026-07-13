import type { SanitizedConfig } from 'payload'
import { getPayload } from 'payload'

import config from '@config'

import { seed } from './seed'

/**
 * Payload bin entry — boots Payload so dev `pushDevSchema` syncs Postgres.
 *
 * Wipe and recreate (undeployed dev only): `PAYLOAD_DROP_DATABASE=true bun run db:push`
 *
 * When `DATA_SEED_ENABLED=1`, runs the full seed chain after push (users → workspaces → budgets → ledger).
 */
export async function script(_config: SanitizedConfig): Promise<void> {
  process.env.PAYLOAD_DISABLE_ON_INIT_SEED = '1'

  const payload = await getPayload({ config: _config })

  if (config.database.seed.enabled) {
    await seed(payload)
  } else {
    payload.logger.warn(
      '🚨 [Seed] DATA_SEED_ENABLED is off — no users or demo data seeded. Run `bun run db:seed all` after setting .env.',
    )
  }

  payload.logger.info('✅ Database schema is in sync.')
}

import type { SanitizedConfig } from 'payload'
import { getPayload } from 'payload'

/**
 * Payload bin entry — boots Payload so dev `pushDevSchema` syncs Postgres.
 *
 * Wipe and recreate (undeployed dev only): `PAYLOAD_DROP_DATABASE=true bun run db:push`
 */
export async function script(config: SanitizedConfig): Promise<void> {
  const payload = await getPayload({ config })
  payload.logger.info('✅ Database schema is in sync.')
}

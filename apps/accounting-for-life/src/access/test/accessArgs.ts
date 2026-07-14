import type { User } from '@/types'
import type { AccessArgs, PayloadRequest } from 'payload'

/**
 * Builds minimal Payload access args for unit tests.
 *
 * @param user - User on the request, or `null` when unauthenticated.
 * @param overrides - Extra AccessArgs fields (e.g. `data` for trash delete).
 */
export const accessArgs = (
  user: User | null = null,
  overrides: Partial<AccessArgs> = {},
): AccessArgs =>
  ({
    req: { user } as PayloadRequest,
    ...overrides,
  }) as AccessArgs

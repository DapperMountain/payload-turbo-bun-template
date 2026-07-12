import type { User } from '@/types'
import type { AccessArgs, PayloadRequest } from 'payload'

/**
 * Builds minimal Payload access args for unit tests.
 *
 * @param user - User on the request, or `null` when unauthenticated.
 */
export const accessArgs = (user: User | null = null): AccessArgs =>
  ({
    req: { user } as PayloadRequest,
  }) as AccessArgs

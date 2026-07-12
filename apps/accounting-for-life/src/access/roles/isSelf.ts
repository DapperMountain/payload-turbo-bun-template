import { withAuth } from '@/access/helpers'
import type { Access, PayloadRequest } from 'payload'

/**
 * Row-level access to the authenticated user's own document (`id` equals `req.user.id`).
 *
 * Unauthenticated requests are denied. System admins bypass via {@link withAuth}.
 */
export const isSelf: Access = withAuth(({ req }: { req: PayloadRequest }) => ({
  id: {
    equals: req.user?.id,
  },
}))

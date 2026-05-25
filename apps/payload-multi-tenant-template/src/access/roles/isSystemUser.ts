import { isAuthenticated } from '@/access/auth'
import { requireAll } from '@/access/helpers'
import { userIsSystemUser } from '@/utils'
import type { Access, PayloadRequest } from 'payload'

/**
 * Collection-level access: authenticated user with a system role (`SYSTEM_ADMIN` or `SYSTEM_USER`).
 *
 * @see {@link userIsSystemUser}
 */
export const isSystemUser: Access = requireAll(
  isAuthenticated,
  ({ req }: { req: PayloadRequest }) => userIsSystemUser(req.user),
)

import { isAuthenticated } from '@/access/auth'
import { requireAll } from '@/access/helpers'
import { isAppUser, userIsSystemAdmin } from '@/utils'
import type { Access, PayloadRequest } from 'payload'

/**
 * Collection-level access: authenticated user with the `SYSTEM_ADMIN` system role.
 *
 * @param args - Payload access args (`req`, `id`, `data`, …).
 * @returns `true` for system admins; otherwise `false`.
 */
export const isSystemAdmin: Access = requireAll(
  isAuthenticated,
  ({ req }: { req: PayloadRequest }) => isAppUser(req.user) && userIsSystemAdmin(req.user),
)

import { userIsSystemAdmin } from '@/utils'
import type { PayloadRequest } from 'payload'

/**
 * Whether the collection appears in the admin navigation for the current user.
 *
 * Admin visibility must return a boolean only (no `Where` constraints). Restricts
 * the Users collection nav to system administrators.
 */
export const canAccessAdminPanel = ({ req }: { req: PayloadRequest }): boolean =>
  userIsSystemAdmin(req.user)

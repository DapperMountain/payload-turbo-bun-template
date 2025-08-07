import isAuthenticated from '@/access/auth/isAuthenticated'
import { requireAll } from '@/access/helpers'
import { User } from '@/types'
import { isSystemAdmin as isSystemAdminHelper } from '@/utils/isSystemAdmin'
import { Access, PayloadRequest } from 'payload'

/**
 * Access control function to determine if a request is made by a system admin.
 *
 * This function requires the user to be authenticated before checking
 * if they have the "SYSTEM_ADMIN" role.
 *
 * @param req - The Payload request object.
 * @returns Boolean indicating whether the user has system admin privileges.
 */
export const isSystemAdmin: Access = requireAll(isAuthenticated, ({ req }: { req: PayloadRequest }): boolean =>
  isSystemAdminHelper(req?.user as User),
)

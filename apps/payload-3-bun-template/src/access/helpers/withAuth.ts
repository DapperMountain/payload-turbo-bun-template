import isAuthenticated from '@/access/auth/isAuthenticated'
import { isSystemAdmin } from '@/access/roles/isSystemAdmin'
import { Access, AccessArgs, AccessResult } from 'payload'

/**
 * Higher-order function to wrap access functions with a system admin check.
 * If the user is a system admin, it short-circuits and grants full access.
 *
 * @param accessFn - The access control function to wrap (requireAll, requireOne, etc.).
 * @returns A new access function that first checks if the user is a system admin.
 */
export const withAuth =
  <T = unknown>(accessFn: Access<T>): Access<T> =>
  async (args: AccessArgs<T>): Promise<AccessResult> => {
    // Check if the user is logged in
    const isLoggedIn = await isAuthenticated(args)

    // If the user is a system admin, grant full access
    if (isLoggedIn === false) {
      return false
    }

    // Check if the user is a system admin
    const hasAdminAccess = await isSystemAdmin(args)

    // If the user is a system admin, grant full access
    if (hasAdminAccess === true) {
      return true
    }

    // Otherwise, proceed with the normal access control function
    return accessFn(args)
  }

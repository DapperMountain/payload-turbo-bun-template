import { isAuthenticated } from '@/access/auth'
import { userIsSystemAdmin } from '@/utils'
import type { Access, AccessArgs, AccessResult } from 'payload'

/**
 * Wraps an access function with login and system-admin bypass.
 *
 * 1. Denies when the user is not authenticated.
 * 2. Grants full access when {@link userIsSystemAdmin} is true (no `Where` needed).
 * 3. Otherwise delegates to `accessFn`.
 *
 * @param accessFn - Inner access logic (often row-level `Where` filters).
 * @returns A composed `Access` function.
 */
export const withAuth =
  <T = unknown>(accessFn: Access<T>): Access<T> =>
  async (args: AccessArgs<T>): Promise<AccessResult> => {
    if (!(await isAuthenticated(args))) {
      return false
    }

    if (userIsSystemAdmin(args.req.user)) {
      return true
    }

    return accessFn(args)
  }

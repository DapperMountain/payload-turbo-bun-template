import type { User } from '@/types'

import type { AuthPrincipal } from './isAppUser'
import { isAppUser } from './isAppUser'

/** System-level role on the user document (`SYSTEM_ADMIN`, `SYSTEM_USER`). */
export type SystemRole = NonNullable<User['roles']>[number]

const systemRoles: SystemRole[] = ['SYSTEM_ADMIN', 'SYSTEM_USER']

/**
 * Whether the user has a system-level role (`SYSTEM_ADMIN` and/or `SYSTEM_USER`).
 *
 * @param user - Authenticated user, or `null` / `undefined` when logged out.
 * @param role - When set, requires this exact system role.
 */
export const userHasSystemRole = (
  user: AuthPrincipal | null | undefined,
  role?: SystemRole,
): boolean => {
  if (!isAppUser(user) || !user.roles?.length) {
    return false
  }

  if (role) {
    return user.roles.includes(role)
  }

  return user.roles.some((r) => systemRoles.includes(r))
}

/**
 * Whether the user is platform staff (any system role).
 *
 * @see {@link userHasSystemRole}
 */
export const userIsSystemUser = (user: AuthPrincipal | null | undefined): boolean =>
  userHasSystemRole(user)

import type { AuthPrincipal } from './isAppUser'
import { isAppUser } from './isAppUser'

/**
 * Returns whether the user has the `SYSTEM_ADMIN` system role.
 *
 * Use this for non-Access call sites (plugins, hooks, utilities). For collection
 * operations, prefer `isSystemAdmin` from `@/access/roles`.
 *
 * @param user - Authenticated user, or `null` / `undefined` when logged out.
 * @returns `true` when `user.roles` includes `SYSTEM_ADMIN`.
 */
export const userIsSystemAdmin = (user: AuthPrincipal | null | undefined): boolean =>
  isAppUser(user) && Boolean(user.roles?.includes('SYSTEM_ADMIN'))

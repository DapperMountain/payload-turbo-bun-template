import type { User } from '@/types'

/**
 * Returns whether the user has the `SYSTEM_ADMIN` system role.
 *
 * Use this for non-Access call sites (plugins, hooks, utilities). For collection
 * operations, prefer `isSystemAdmin` from `@/access/roles`.
 *
 * @param user - Authenticated user, or `null` / `undefined` when logged out.
 * @returns `true` when `user.roles` includes `SYSTEM_ADMIN`.
 */
export const userIsSystemAdmin = (user: User | null | undefined): boolean =>
  Boolean(user?.roles?.includes('SYSTEM_ADMIN'))

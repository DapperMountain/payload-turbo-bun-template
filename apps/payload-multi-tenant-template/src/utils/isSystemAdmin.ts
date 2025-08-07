import { User } from '@/types'

/**
 * Determines if a user has the "SYSTEM_ADMIN" role.
 *
 * @param user - The user object.
 * @returns Boolean indicating whether the user is a system admin.
 */
export const isSystemAdmin = (user: User): boolean => Boolean(user?.roles?.includes('SYSTEM_ADMIN'))

import type { CollectionConfig } from 'payload'

import { canAccessAdminPanel, isSelf, isSystemAdmin } from '@/access/roles'

/**
 * Access control for the `users` collection.
 */
export const usersAccess: NonNullable<CollectionConfig['access']> = {
  read: isSelf,
  create: isSystemAdmin,
  update: isSelf,
  delete: isSystemAdmin,
  admin: canAccessAdminPanel,
  unlock: isSystemAdmin,
}

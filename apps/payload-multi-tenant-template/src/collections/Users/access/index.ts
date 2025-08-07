import { boolean } from '@/access/helpers'
import isSelf from '@/access/roles/isSelf'
import { isSystemAdmin } from '@/access/roles/isSystemAdmin'
import { CollectionConfig } from 'payload'

/**
 * Defines access control for the collection.
 */
export const access: CollectionConfig['access'] = {
  read: isSelf,
  create: isSystemAdmin,
  update: isSelf,
  delete: isSystemAdmin,
  admin: boolean(isSystemAdmin),
  unlock: isSystemAdmin,
}

import { isSystemAdmin } from '@/access/roles/isSystemAdmin'
import isTenantAdmin from '@/access/tenants/isTenantAdmin'
import { CollectionConfig } from 'payload'

/**
 * Defines access control for the collection.
 */
export const access: CollectionConfig['access'] = {
  read: isSystemAdmin,
  create: isSystemAdmin,
  update: isTenantAdmin,
  delete: isSystemAdmin,
}

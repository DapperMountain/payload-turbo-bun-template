import { isSystemAdmin } from '@/access/roles/isSystemAdmin'
import isTenant from '@/access/tenants/isTenant'
import isTenantAdmin from '@/access/tenants/isTenantAdmin'
import { CollectionConfig } from 'payload'

/**
 * Defines access control for the collection.
 */
export const access: CollectionConfig['access'] = {
  read: isTenant,
  create: isSystemAdmin,
  update: isTenantAdmin,
  delete: isSystemAdmin,
}

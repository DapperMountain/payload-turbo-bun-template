import type { CollectionConfig } from 'payload'

import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isTenant, isTenantAdmin } from '@/access/tenants'

/**
 * Access control for the `tenants` collection.
 *
 * **Read (`tenantsReadAccess`)** — System admins see all tenants. Members see only
 * workspaces they belong to. See `docs/CODE_CONVENTIONS.md` and access tests.
 *
 * **Update** — System admins: all rows; tenant admins: `TENANT_ADMIN` scope only.
 *
 * **Create / delete** — System administrators only.
 */
export const tenantsReadAccess = requireOne(isSystemAdmin, isTenant)

export const tenantsAccess: NonNullable<CollectionConfig['access']> = {
  read: tenantsReadAccess,
  create: isSystemAdmin,
  update: isTenantAdmin,
  delete: isSystemAdmin,
}

import { withAuth } from '@/access/helpers'
import { getUserTenantIds, type TenantRole } from '@/utils'
import type { Access } from 'payload'

/**
 * Row-level access for tenant-owned documents (plugin `tenant` relationship field).
 *
 * Filters `{ [tenantField]: { in: tenantIds } }`, not `{ id: { in: … } }` — use
 * {@link tenantScope} for the `tenants` collection itself.
 *
 * When `useTenantAccess: true` on a collection, the plugin also adds a membership
 * filter; this helper is for custom access, `useTenantAccess: false`, or role splits.
 *
 * @param role - When set, only memberships whose `roles` include this value count.
 * @param tenantField - Relationship field name (default `tenant`).
 */
export const tenantContentScope =
  (role?: TenantRole, tenantField = 'tenant'): Access =>
  withAuth(({ req: { user } }) => {
    const tenantIds = getUserTenantIds(user, role)

    return tenantIds.length ? { [tenantField]: { in: tenantIds } } : false
  })

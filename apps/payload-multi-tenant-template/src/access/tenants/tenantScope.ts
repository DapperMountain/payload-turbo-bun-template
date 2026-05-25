import { withAuth } from '@/access/helpers'
import { getUserTenantIds, type TenantRole } from '@/utils'
import type { Access } from 'payload'

/**
 * Row-level access limited to tenant documents the user belongs to.
 *
 * Optionally filters membership rows to those that include `role` (e.g. only
 * `TENANT_ADMIN`). System admins bypass via {@link withAuth}.
 *
 * @param role - When set, only tenant memberships whose `roles` include this value count.
 * @returns An `Access` function that yields `{ id: { in: tenantIds } }` or `false`.
 */
export const tenantScope =
  (role?: TenantRole): Access =>
  withAuth(({ req: { user } }) => {
    const tenantIds = getUserTenantIds(user, role)

    return tenantIds.length ? { id: { in: tenantIds } } : false
  })

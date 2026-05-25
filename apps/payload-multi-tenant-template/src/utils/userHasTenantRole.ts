import type { Tenant } from '@/types'

import { getCollectionId } from './getCollectionId'
import type { AuthPrincipal } from './isAppUser'
import { isAppUser } from './isAppUser'
import type { TenantRole } from './tenantRole'

/**
 * Whether the user belongs to a tenant, optionally with a specific role.
 *
 * @param user - Authenticated user, or `null` / `undefined` when logged out.
 * @param tenantId - Tenant document id to check.
 * @param role - When set, the membership row must include this role.
 */
export const userHasTenantRole = (
  user: AuthPrincipal | null | undefined,
  tenantId: Tenant['id'],
  role?: TenantRole,
): boolean => {
  if (!isAppUser(user) || !user.tenants?.length) {
    return false
  }

  return user.tenants.some((row) => {
    const id = getCollectionId(row.tenant)

    if (!id || id !== tenantId) {
      return false
    }

    return !role || row.roles.includes(role)
  })
}

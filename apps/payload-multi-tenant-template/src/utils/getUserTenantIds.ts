import type { Tenant } from '@/types'

import { getCollectionId } from './getCollectionId'
import type { AuthPrincipal } from './isAppUser'
import { isAppUser } from './isAppUser'
import type { TenantRole } from './tenantRole'

/**
 * Retrieves an array of all tenant Ids assigned to a user.
 *
 * @param user - The user object containing tenant relationships.
 * @param role - (Optional) A specific role to filter tenants by.
 * @returns An array of tenant Ids associated with the user.
 */
export const getUserTenantIds = (
  user: AuthPrincipal | null | undefined,
  role?: TenantRole,
): Tenant['id'][] => {
  if (!isAppUser(user) || !user.tenants?.length) return []

  return user.tenants
    .filter(({ roles }) => !role || roles.includes(role))
    .map(({ tenant }) => getCollectionId(tenant))
    .filter((id): id is Tenant['id'] => Boolean(id)) // Ensures only valid IDs
}

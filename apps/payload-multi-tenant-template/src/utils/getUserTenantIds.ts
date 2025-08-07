import type { Tenant, User } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

/**
 * Retrieves an array of all tenant Ids assigned to a user.
 *
 * @param user - The user object containing tenant relationships.
 * @param role - (Optional) A specific role to filter tenants by.
 * @returns An array of tenant Ids associated with the user.
 */
export const getUserTenantIds = (
  user: User | null,
  role?: NonNullable<User['tenants']>[number]['roles'][number],
): Tenant['id'][] => {
  if (!user?.tenants?.length) return []

  return user.tenants
    .filter(({ roles }) => !role || roles.includes(role))
    .map(({ tenant }) => getCollectionId(tenant))
    .filter((id): id is Tenant['id'] => Boolean(id)) // Ensures only valid IDs
}

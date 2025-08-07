import { withAuth } from '@/access/helpers'
import { getUserTenantIds } from '@/utils/getUserTenantIds'
import type { Access } from 'payload'

/**
 * Access control function to check if the user is part of any tenant for read access.
 *
 * @param req - The request object containing the authenticated user.
 * @returns - A `Where` clause that filters tenants based on the user's tenant memberships.
 */
const isTenant: Access = withAuth(({ req: { user } }) => {
  const tenantIds = getUserTenantIds(user)

  return tenantIds.length ? { id: { in: tenantIds } } : false
})

export default isTenant

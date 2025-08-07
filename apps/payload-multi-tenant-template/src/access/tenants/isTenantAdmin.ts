import { withAuth } from '@/access/helpers'
import { getUserTenantIds } from '@/utils/getUserTenantIds'
import type { Access } from 'payload'

/**
 * Access control function to check if the user is a tenant admin.
 * Grants access if the user is a system admin or a tenant admin.
 *
 * @param req - The request object containing the authenticated user.
 * @returns - `true` if the user is a system admin, or a `Where` clause that filters tenants based on the user's admin roles.
 */
const isTenantAdmin: Access = withAuth(({ req: { user } }) => {
  const ids = getUserTenantIds(user, 'TENANT_ADMIN')

  return ids.length ? { id: { in: ids } } : false
})

export default isTenantAdmin

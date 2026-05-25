import type { Tenant, User } from '@/types'

import { getUserTenantIds } from './getUserTenantIds'
import { userHasTenantRole } from './userHasTenantRole'

/**
 * Whether the user has the `TENANT_ADMIN` role.
 *
 * @param user - Authenticated user, or `null` / `undefined` when logged out.
 * @param tenantId - When set, checks admin role on that tenant only; otherwise any tenant.
 */
export const userIsTenantAdmin = (
  user: User | null | undefined,
  tenantId?: Tenant['id'],
): boolean =>
  tenantId !== undefined
    ? userHasTenantRole(user, tenantId, 'TENANT_ADMIN')
    : getUserTenantIds(user, 'TENANT_ADMIN').length > 0

import type { Tenant, User } from '@/types'

import { userHasTenantRole } from './userHasTenantRole'

/**
 * Whether the user is a member of the tenant (any tenant role).
 *
 * @see {@link userHasTenantRole}
 */
export const userBelongsToTenant = (
  user: User | null | undefined,
  tenantId: Tenant['id'],
): boolean => userHasTenantRole(user, tenantId)

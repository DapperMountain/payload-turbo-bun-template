import type { Tenant } from '@/types'
import type { PayloadRequest } from 'payload'

import { getTenantFromCookie } from './getTenantFromCookie'
import type { TenantRole } from './tenantRole'
import { userHasTenantRole } from './userHasTenantRole'

type Args = Pick<PayloadRequest, 'headers' | 'payload' | 'user'>

/**
 * Whether the user may act in the admin-selected tenant (`payload-tenant` cookie).
 *
 * Combines cookie context with membership (and optional role). Use in hooks and
 * custom endpoints — not a substitute for plugin collection access on enabled slugs.
 *
 * @param req - Payload request (or subset with `headers`, `payload`, `user`).
 * @param role - When set, requires this tenant role on the selected tenant.
 */
export const userCanAccessActiveTenant = (req: Args, role?: TenantRole): boolean => {
  const idType = req.payload.db.defaultIDType === 'number' ? 'number' : 'text'
  const tenantId = getTenantFromCookie(req.headers, idType)

  if (tenantId == null || tenantId === '') {
    return false
  }

  return userHasTenantRole(req.user, tenantId as Tenant['id'], role)
}

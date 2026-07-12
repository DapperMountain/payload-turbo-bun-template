import type { CollectionConfig } from 'payload'

import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isTenantContent, isTenantContentAdmin } from '@/access/tenants'

/**
 * Starter access map for collections with a plugin `tenant` field (e.g. `pages`, `media`).
 *
 * - **Read** — system admins see all; members see docs in their tenant(s).
 * - **Create / update** — system admins or tenant admins in scope.
 * - **Delete** — system admins only.
 *
 * With `useTenantAccess: true`, the plugin also ANDs `{ tenant: { in: memberships } }`.
 * Use this map as-is when `useTenantAccess: false`, or split operations and rely on the
 * plugin for read while keeping create/update/delete rules here.
 */
export const tenantContentReadAccess = requireOne(isSystemAdmin, isTenantContent)

export const tenantContentAccess: NonNullable<CollectionConfig['access']> = {
  read: tenantContentReadAccess,
  create: requireOne(isSystemAdmin, isTenantContentAdmin),
  update: requireOne(isSystemAdmin, isTenantContentAdmin),
  delete: isSystemAdmin,
}

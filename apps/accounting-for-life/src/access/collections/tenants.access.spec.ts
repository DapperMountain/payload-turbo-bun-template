import { describe, it } from 'bun:test'

import { tenantsAccess } from '@/access/collections'
import {
  accessArgs,
  expectAccess,
  systemAdminUser,
  tenantAdminUser,
  tenantMemberUser,
  userWithoutTenants,
} from '@/access/test'

describe('tenantsAccess', () => {
  describe('read', () => {
    const read = tenantsAccess.read!

    it('allows system admins to read all tenants', async () => {
      await expectAccess(read, systemAdminUser, true)
    })

    it('allows tenant members to read only their workspaces', async () => {
      await expectAccess(read, tenantMemberUser, { id: { in: ['tenant-a'] } })
    })

    it('allows tenant admins to read only their administered workspaces', async () => {
      await expectAccess(read, tenantAdminUser, { id: { in: ['tenant-a'] } })
    })

    it('denies users with no tenant memberships', async () => {
      await expectAccess(read, userWithoutTenants, false)
    })

    it('denies unauthenticated requests', async () => {
      await expectAccess(read, null, false)
    })
  })

  describe('update', () => {
    const update = tenantsAccess.update!

    it('allows system admins to update any tenant', async () => {
      await expectAccess(update, systemAdminUser, true)
    })

    it('scopes tenant admins to workspaces where they hold TENANT_ADMIN', async () => {
      await expectAccess(update, tenantAdminUser, { id: { in: ['tenant-a'] } })
    })

    it('denies tenant members without TENANT_ADMIN', async () => {
      await expectAccess(update, tenantMemberUser, false)
    })
  })
})

import { describe, it } from 'bun:test'

import { tenantContentAccess } from '@/access/collections'
import { expectAccess, systemAdminUser, tenantAdminUser, tenantMemberUser } from '@/access/test'

const tenantScope = { tenant: { in: ['tenant-a'] } }

describe('tenantContentAccess', () => {
  describe('read', () => {
    const read = tenantContentAccess.read!

    it('allows system admins full access', async () => {
      await expectAccess(read, systemAdminUser, true)
    })

    it('scopes tenant members to their workspaces', async () => {
      await expectAccess(read, tenantMemberUser, tenantScope)
    })

    it('denies unauthenticated requests', async () => {
      await expectAccess(read, null, false)
    })
  })

  describe.each(['create', 'update'] as const)('%s', (operation) => {
    const access = tenantContentAccess[operation]!

    it('allows system admins full access', async () => {
      await expectAccess(access, systemAdminUser, true)
    })

    it('scopes tenant admins to their workspaces', async () => {
      await expectAccess(access, tenantAdminUser, tenantScope)
    })

    it('denies tenant members without TENANT_ADMIN', async () => {
      await expectAccess(access, tenantMemberUser, false)
    })
  })

  describe('delete', () => {
    const del = tenantContentAccess.delete!

    it.each([
      ['system admin', systemAdminUser, true],
      ['tenant admin', tenantAdminUser, false],
      ['tenant member', tenantMemberUser, false],
    ])('%s', async (_label, user, allowed) => {
      await expectAccess(del, user, allowed)
    })
  })
})

import { describe, expect, it } from 'bun:test'

import { accessArgs, systemAdminUser, tenantAdminUser, tenantMemberUser } from '@/access/test'

import { isTenant } from './isTenant'
import { isTenantAdmin } from './isTenantAdmin'
import { isTenantContent, isTenantContentAdmin } from './isTenantContent'

describe('tenantScope (workspace documents)', () => {
  it('scopes members to workspace ids via isTenant', async () => {
    await expect(isTenant(accessArgs(tenantMemberUser))).resolves.toEqual({
      id: { in: ['tenant-a'] },
    })
  })

  it('scopes tenant admins via isTenantAdmin', async () => {
    await expect(isTenantAdmin(accessArgs(tenantAdminUser))).resolves.toEqual({
      id: { in: ['tenant-a'] },
    })
  })

  it('allows system admins full access', async () => {
    await expect(isTenant(accessArgs(systemAdminUser))).resolves.toBe(true)
  })
})

describe('tenantContentScope (tenant-owned content)', () => {
  it('scopes members to tenant field via isTenantContent', async () => {
    await expect(isTenantContent(accessArgs(tenantMemberUser))).resolves.toEqual({
      tenant: { in: ['tenant-a'] },
    })
  })

  it('scopes tenant admins via isTenantContentAdmin', async () => {
    await expect(isTenantContentAdmin(accessArgs(tenantAdminUser))).resolves.toEqual({
      tenant: { in: ['tenant-a'] },
    })
  })

  it('allows system admins full access', async () => {
    await expect(isTenantContent(accessArgs(systemAdminUser))).resolves.toBe(true)
  })
})

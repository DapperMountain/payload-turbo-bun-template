import { describe, expect, it } from 'bun:test'

import { accessArgs } from '@/access/test'
import { systemAdminUser, tenantMemberUser } from '@/access/test'

import { canAccessAdminPanel } from './canAccessAdminPanel'
import { isAdminOrSelf } from './isAdminOrSelf'
import { isCreatedBy } from './isCreatedBy'
import { isSelf } from './isSelf'
import { isSystemAdmin } from './isSystemAdmin'
import { isSystemUser } from './isSystemUser'

describe('isSystemAdmin', () => {
  it('allows system admins only', async () => {
    await expect(isSystemAdmin(accessArgs(systemAdminUser))).resolves.toBe(true)
    await expect(isSystemAdmin(accessArgs(tenantMemberUser))).resolves.toBe(false)
    await expect(isSystemAdmin(accessArgs(null))).resolves.toBe(false)
  })
})

describe('isSystemUser', () => {
  const access = isSystemUser

  it('allows users with a system role', async () => {
    await expect(access(accessArgs(tenantMemberUser))).resolves.toBe(true)
    await expect(access(accessArgs(systemAdminUser))).resolves.toBe(true)
  })

  it('denies unauthenticated requests', async () => {
    await expect(access(accessArgs(null))).resolves.toBe(false)
  })
})

describe('isSelf', () => {
  it('scopes to the authenticated user id', async () => {
    await expect(isSelf(accessArgs(tenantMemberUser))).resolves.toEqual({
      id: { equals: tenantMemberUser.id },
    })
  })

  it('allows system admins full access', async () => {
    await expect(isSelf(accessArgs(systemAdminUser))).resolves.toBe(true)
  })
})

describe('canAccessAdminPanel', () => {
  it('returns true only for system admins', () => {
    expect(canAccessAdminPanel({ req: accessArgs(systemAdminUser).req })).toBe(true)
    expect(canAccessAdminPanel({ req: accessArgs(tenantMemberUser).req })).toBe(false)
  })
})

describe('isAdminOrSelf', () => {
  const access = isAdminOrSelf

  it('allows system admins full access', async () => {
    await expect(access(accessArgs(systemAdminUser))).resolves.toBe(true)
  })

  it('scopes non-admins to their own user id', async () => {
    await expect(access(accessArgs(tenantMemberUser))).resolves.toEqual({
      id: { equals: tenantMemberUser.id },
    })
  })
})

describe('isCreatedBy', () => {
  it('scopes to the author field', async () => {
    await expect(isCreatedBy(accessArgs(tenantMemberUser))).resolves.toEqual({
      createdBy: { equals: tenantMemberUser.id },
    })
  })
})

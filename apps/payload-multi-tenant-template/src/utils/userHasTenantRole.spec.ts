import { describe, expect, it } from 'bun:test'

import type { User } from '@/types'

import { userBelongsToTenant } from './userBelongsToTenant'
import { userHasTenantRole } from './userHasTenantRole'
import { userIsTenantAdmin } from './userIsTenantAdmin'

const baseUser = {
  id: 'user-1',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  collection: 'users' as const,
  roles: ['SYSTEM_USER'] as User['roles'],
}

describe('userHasTenantRole', () => {
  const user: User = {
    ...baseUser,
    tenants: [
      { tenant: 'tenant-a', roles: ['TENANT_USER'] },
      { tenant: 'tenant-b', roles: ['TENANT_ADMIN'] },
    ],
  }

  it('returns true for any role on a membership row', () => {
    expect(userHasTenantRole(user, 'tenant-a')).toBe(true)
    expect(userHasTenantRole(user, 'tenant-b')).toBe(true)
  })

  it('returns false for tenants the user does not belong to', () => {
    expect(userHasTenantRole(user, 'tenant-c')).toBe(false)
  })

  it('filters by role when provided', () => {
    expect(userHasTenantRole(user, 'tenant-a', 'TENANT_ADMIN')).toBe(false)
    expect(userHasTenantRole(user, 'tenant-b', 'TENANT_ADMIN')).toBe(true)
    expect(userHasTenantRole(user, 'tenant-a', 'TENANT_USER')).toBe(true)
  })

  it('returns false when user is null or has no tenants', () => {
    expect(userHasTenantRole(null, 'tenant-a')).toBe(false)
    expect(userHasTenantRole({ ...baseUser, tenants: [] }, 'tenant-a')).toBe(false)
  })
})

describe('userBelongsToTenant', () => {
  it('matches userHasTenantRole without a role', () => {
    const user: User = {
      ...baseUser,
      tenants: [{ tenant: 'tenant-a', roles: ['TENANT_USER'] }],
    }

    expect(userBelongsToTenant(user, 'tenant-a')).toBe(true)
    expect(userBelongsToTenant(user, 'tenant-b')).toBe(false)
  })
})

describe('userIsTenantAdmin', () => {
  const user: User = {
    ...baseUser,
    tenants: [
      { tenant: 'tenant-a', roles: ['TENANT_USER'] },
      { tenant: 'tenant-b', roles: ['TENANT_ADMIN'] },
    ],
  }

  it('checks a specific tenant when tenantId is passed', () => {
    expect(userIsTenantAdmin(user, 'tenant-a')).toBe(false)
    expect(userIsTenantAdmin(user, 'tenant-b')).toBe(true)
  })

  it('returns true when admin of any tenant if tenantId is omitted', () => {
    expect(userIsTenantAdmin(user)).toBe(true)
    expect(userIsTenantAdmin({ ...baseUser, tenants: [{ tenant: 'tenant-a', roles: ['TENANT_USER'] }] })).toBe(
      false,
    )
  })
})

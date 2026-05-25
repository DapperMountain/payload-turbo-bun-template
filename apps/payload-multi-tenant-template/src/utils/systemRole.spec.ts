import { describe, expect, it } from 'bun:test'

import type { User } from '@/types'

import { userHasSystemRole, userIsSystemUser } from './systemRole'

const baseUser = {
  id: 'user-1',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  collection: 'users' as const,
}

describe('userHasSystemRole', () => {
  it('returns true for SYSTEM_USER and SYSTEM_ADMIN', () => {
    expect(userHasSystemRole({ ...baseUser, roles: ['SYSTEM_USER'] })).toBe(true)
    expect(userHasSystemRole({ ...baseUser, roles: ['SYSTEM_ADMIN'] })).toBe(true)
  })

  it('filters by role when provided', () => {
    const admin: User = { ...baseUser, roles: ['SYSTEM_ADMIN'] }

    expect(userHasSystemRole(admin, 'SYSTEM_ADMIN')).toBe(true)
    expect(userHasSystemRole(admin, 'SYSTEM_USER')).toBe(false)
  })

  it('returns false when user has no roles', () => {
    expect(userHasSystemRole({ ...baseUser, roles: [] })).toBe(false)
    expect(userHasSystemRole(null)).toBe(false)
  })
})

describe('userIsSystemUser', () => {
  it('matches userHasSystemRole without a specific role', () => {
    expect(userIsSystemUser({ ...baseUser, roles: ['SYSTEM_USER'] })).toBe(true)
    expect(userIsSystemUser({ ...baseUser, roles: [] })).toBe(false)
  })
})

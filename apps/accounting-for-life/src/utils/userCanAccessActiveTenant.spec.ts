import { describe, expect, it } from 'bun:test'

import type { User } from '@/types'
import type { PayloadRequest } from 'payload'

import { userCanAccessActiveTenant } from './userCanAccessActiveTenant'

const member: User = {
  id: 'user-1',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  collection: 'users',
  roles: ['SYSTEM_USER'],
  tenants: [{ tenant: 'tenant-a', roles: ['TENANT_USER'] }],
}

const req = (cookieTenant: string | null, user: User | null): Pick<PayloadRequest, 'headers' | 'payload' | 'user'> => {
  const headers = new Headers()

  if (cookieTenant) {
    headers.set('cookie', `payload-tenant=${cookieTenant}`)
  }

  return {
    headers,
    user,
    payload: { db: { defaultIDType: 'text' } } as PayloadRequest['payload'],
  }
}

describe('userCanAccessActiveTenant', () => {
  it('returns true when cookie tenant matches membership', () => {
    expect(userCanAccessActiveTenant(req('tenant-a', member))).toBe(true)
  })

  it('returns false when cookie tenant is not a membership', () => {
    expect(userCanAccessActiveTenant(req('tenant-b', member))).toBe(false)
  })

  it('returns false when cookie is missing', () => {
    expect(userCanAccessActiveTenant(req(null, member))).toBe(false)
  })

  it('filters by role when provided', () => {
    const admin: User = {
      ...member,
      tenants: [{ tenant: 'tenant-a', roles: ['TENANT_ADMIN'] }],
    }

    expect(userCanAccessActiveTenant(req('tenant-a', member), 'TENANT_ADMIN')).toBe(false)
    expect(userCanAccessActiveTenant(req('tenant-a', admin), 'TENANT_ADMIN')).toBe(true)
  })
})

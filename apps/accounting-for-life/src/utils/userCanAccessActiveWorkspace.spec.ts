import { describe, expect, it } from 'bun:test'

import type { User } from '@/types'
import type { PayloadRequest } from 'payload'

import { userCanAccessActiveWorkspace } from './userCanAccessActiveWorkspace'

const member: User = {
  id: 'user-1',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  collection: 'users',
  roles: ['SYSTEM_USER'],
  workspaces: [{ workspace: 'workspace-a', roles: ['WORKSPACE_USER'] }],
}

const req = (
  cookieWorkspace: string | null,
  user: User | null,
): Pick<PayloadRequest, 'headers' | 'payload' | 'user'> => {
  const headers = new Headers()

  if (cookieWorkspace) {
    headers.set('cookie', `payload-tenant=${cookieWorkspace}`)
  }

  return {
    headers,
    user,
    payload: { db: { defaultIDType: 'text' } } as PayloadRequest['payload'],
  }
}

describe('userCanAccessActiveWorkspace', () => {
  it('returns true when cookie workspace matches membership', () => {
    expect(userCanAccessActiveWorkspace(req('workspace-a', member))).toBe(true)
  })

  it('returns false when cookie workspace is not a membership', () => {
    expect(userCanAccessActiveWorkspace(req('workspace-b', member))).toBe(false)
  })

  it('returns false when cookie is missing', () => {
    expect(userCanAccessActiveWorkspace(req(null, member))).toBe(false)
  })

  it('filters by role when provided', () => {
    const admin: User = {
      ...member,
      workspaces: [{ workspace: 'workspace-a', roles: ['WORKSPACE_ADMIN'] }],
    }

    expect(userCanAccessActiveWorkspace(req('workspace-a', member), 'WORKSPACE_ADMIN')).toBe(false)
    expect(userCanAccessActiveWorkspace(req('workspace-a', admin), 'WORKSPACE_ADMIN')).toBe(true)
  })
})

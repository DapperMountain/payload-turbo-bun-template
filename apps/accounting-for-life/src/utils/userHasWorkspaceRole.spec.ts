import { describe, expect, it } from 'bun:test'

import type { User } from '@/types'

import { userBelongsToWorkspace } from './userBelongsToWorkspace'
import { userHasWorkspaceRole } from './userHasWorkspaceRole'
import { userIsWorkspaceAdmin } from './userIsWorkspaceAdmin'

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

describe('userHasWorkspaceRole', () => {
  const user: User = {
    ...baseUser,
    workspaces: [
      { workspace: 'workspace-a', roles: ['WORKSPACE_USER'] },
      { workspace: 'workspace-b', roles: ['WORKSPACE_ADMIN'] },
    ],
  }

  it('returns true for any role on a membership row', () => {
    expect(userHasWorkspaceRole(user, 'workspace-a')).toBe(true)
    expect(userHasWorkspaceRole(user, 'workspace-b')).toBe(true)
  })

  it('returns false for workspaces the user does not belong to', () => {
    expect(userHasWorkspaceRole(user, 'workspace-c')).toBe(false)
  })

  it('filters by role when provided', () => {
    expect(userHasWorkspaceRole(user, 'workspace-a', 'WORKSPACE_ADMIN')).toBe(false)
    expect(userHasWorkspaceRole(user, 'workspace-b', 'WORKSPACE_ADMIN')).toBe(true)
    expect(userHasWorkspaceRole(user, 'workspace-a', 'WORKSPACE_USER')).toBe(true)
  })

  it('returns false when user is null or has no workspaces', () => {
    expect(userHasWorkspaceRole(null, 'workspace-a')).toBe(false)
    expect(userHasWorkspaceRole({ ...baseUser, workspaces: [] }, 'workspace-a')).toBe(false)
  })
})

describe('userBelongsToWorkspace', () => {
  it('matches userHasWorkspaceRole without a role', () => {
    const user: User = {
      ...baseUser,
      workspaces: [{ workspace: 'workspace-a', roles: ['WORKSPACE_USER'] }],
    }

    expect(userBelongsToWorkspace(user, 'workspace-a')).toBe(true)
    expect(userBelongsToWorkspace(user, 'workspace-b')).toBe(false)
  })
})

describe('userIsWorkspaceAdmin', () => {
  const user: User = {
    ...baseUser,
    workspaces: [
      { workspace: 'workspace-a', roles: ['WORKSPACE_USER'] },
      { workspace: 'workspace-b', roles: ['WORKSPACE_ADMIN'] },
    ],
  }

  it('checks a specific workspace when workspaceId is passed', () => {
    expect(userIsWorkspaceAdmin(user, 'workspace-a')).toBe(false)
    expect(userIsWorkspaceAdmin(user, 'workspace-b')).toBe(true)
  })

  it('returns true when admin of any workspace if workspaceId is omitted', () => {
    expect(userIsWorkspaceAdmin(user)).toBe(true)
    expect(
      userIsWorkspaceAdmin({ ...baseUser, workspaces: [{ workspace: 'workspace-a', roles: ['WORKSPACE_USER'] }] }),
    ).toBe(false)
  })
})

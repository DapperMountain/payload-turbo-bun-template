import { describe, expect, it } from 'bun:test'

import { accessArgs, systemAdminUser, workspaceAdminUser, workspaceMemberUser } from '@/access/test'

import { isWorkspace } from './isWorkspace'
import { isWorkspaceAdmin } from './isWorkspaceAdmin'
import { isWorkspaceContent, isWorkspaceContentAdmin } from './isWorkspaceContent'

describe('workspaceScope (workspace documents)', () => {
  it('scopes members to workspace ids via isWorkspace', async () => {
    await expect(isWorkspace(accessArgs(workspaceMemberUser))).resolves.toEqual({
      id: { in: ['workspace-a'] },
    })
  })

  it('scopes workspace admins via isWorkspaceAdmin', async () => {
    await expect(isWorkspaceAdmin(accessArgs(workspaceAdminUser))).resolves.toEqual({
      id: { in: ['workspace-a'] },
    })
  })

  it('allows system admins full access', async () => {
    await expect(isWorkspace(accessArgs(systemAdminUser))).resolves.toBe(true)
  })
})

describe('workspaceContentScope (workspace-owned content)', () => {
  it('scopes members to workspace field via isWorkspaceContent', async () => {
    await expect(isWorkspaceContent(accessArgs(workspaceMemberUser))).resolves.toEqual({
      workspace: { in: ['workspace-a'] },
    })
  })

  it('scopes workspace admins via isWorkspaceContentAdmin', async () => {
    await expect(isWorkspaceContentAdmin(accessArgs(workspaceAdminUser))).resolves.toEqual({
      workspace: { in: ['workspace-a'] },
    })
  })

  it('allows system admins full access', async () => {
    await expect(isWorkspaceContent(accessArgs(systemAdminUser))).resolves.toBe(true)
  })
})

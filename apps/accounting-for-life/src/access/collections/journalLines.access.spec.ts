import { describe, expect, it } from 'bun:test'

import { journalLinesAccess } from '@/access/collections'
import { accessArgs, systemAdminUser, workspaceMemberUser } from '@/access/test'

describe('journalLinesAccess', () => {
  describe('read', () => {
    const read = journalLinesAccess.read!

    it('scopes workspace members to their workspaces', async () => {
      const result = await read(accessArgs(workspaceMemberUser))
      expect(result).toEqual({ workspace: { in: ['workspace-a'] } })
    })
  })

  describe.each(['create', 'update', 'delete'] as const)('%s', (operation) => {
    const access = journalLinesAccess[operation]!

    it('denies direct writes for everyone', () => {
      expect(access(accessArgs(systemAdminUser))).toBe(false)
      expect(access(accessArgs(workspaceMemberUser))).toBe(false)
    })
  })
})

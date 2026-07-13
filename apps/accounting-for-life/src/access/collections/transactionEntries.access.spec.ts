import { describe, expect, it } from 'bun:test'

import { transactionEntriesAccess } from '@/access/collections'
import { accessArgs, systemAdminUser, workspaceMemberUser } from '@/access/test'

describe('transactionEntriesAccess', () => {
  describe('read', () => {
    const read = transactionEntriesAccess.read!

    it('scopes workspace members to their workspaces', async () => {
      const result = await read(accessArgs(workspaceMemberUser))
      expect(result).toEqual({ workspace: { in: ['workspace-a'] } })
    })
  })

  describe.each(['create', 'update', 'delete'] as const)('%s', (operation) => {
    const access = transactionEntriesAccess[operation]!

    it('denies direct writes for everyone', () => {
      expect(access(accessArgs(systemAdminUser))).toBe(false)
      expect(access(accessArgs(workspaceMemberUser))).toBe(false)
    })
  })
})

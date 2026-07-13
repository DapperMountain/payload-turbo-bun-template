import { describe, it } from 'bun:test'

import { transactionsAccess } from '@/access/collections'
import {
  expectAccess,
  systemAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const workspaceScope = { workspace: { in: ['workspace-a'] } }

describe('transactionsAccess', () => {
  describe('read', () => {
    const read = transactionsAccess.read!

    it('scopes workspace members to their workspaces', async () => {
      await expectAccess(read, workspaceMemberUser, workspaceScope)
    })
  })

  describe.each(['create', 'update', 'delete'] as const)('%s', (operation) => {
    const access = transactionsAccess[operation]!

    it('allows workspace members in their workspace', async () => {
      await expectAccess(access, workspaceMemberUser, workspaceScope)
    })
  })
})

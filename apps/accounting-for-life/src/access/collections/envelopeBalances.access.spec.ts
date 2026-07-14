import { describe, it } from 'bun:test'

import { envelopeBalancesAccess } from '@/access/collections'
import {
  expectAccess,
  systemAdminUser,
  workspaceAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const workspaceScope = { workspace: { in: ['workspace-a'] } }

describe('envelopeBalancesAccess', () => {
  describe.each(['create', 'update'] as const)('%s', (operation) => {
    const access = envelopeBalancesAccess[operation]!

    it('allows system admins full access', async () => {
      await expectAccess(access, systemAdminUser, true)
    })

    it('scopes workspace members to their workspaces', async () => {
      await expectAccess(access, workspaceMemberUser, workspaceScope)
    })

    it('scopes workspace admins to their workspaces', async () => {
      await expectAccess(access, workspaceAdminUser, workspaceScope)
    })
  })

  describe('delete', () => {
    const del = envelopeBalancesAccess.delete!

    it('allows system admins only', async () => {
      await expectAccess(del, systemAdminUser, true)
      await expectAccess(del, workspaceAdminUser, false)
      await expectAccess(del, workspaceMemberUser, false)
    })
  })
})

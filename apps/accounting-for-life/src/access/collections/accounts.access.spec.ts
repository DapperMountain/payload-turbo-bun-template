import { describe, it } from 'bun:test'

import { accountsAccess } from '@/access/collections'
import {
  budgetReadonlyUser,
  expectAccess,
  systemAdminUser,
  workspaceAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const budgetScope = { budget: { in: ['budget-a'] } }

describe('accountsAccess', () => {
  describe('read', () => {
    const read = accountsAccess.read!

    it('allows system admins full access', async () => {
      await expectAccess(read, systemAdminUser, true)
    })

    it('scopes budget members to their budgets', async () => {
      await expectAccess(read, workspaceMemberUser, budgetScope)
    })

    it('allows readonly members to read', async () => {
      await expectAccess(read, budgetReadonlyUser, budgetScope)
    })
  })

  describe.each(['create', 'update'] as const)('%s', (operation) => {
    const access = accountsAccess[operation]!

    it('allows system admins full access', async () => {
      await expectAccess(access, systemAdminUser, true)
    })

    it('allows budget members that can write', async () => {
      await expectAccess(access, workspaceMemberUser, budgetScope)
    })

    it('denies readonly budget members', async () => {
      await expectAccess(access, budgetReadonlyUser, false)
    })

    it('denies unauthenticated requests', async () => {
      await expectAccess(access, null, false)
    })
  })

  describe('delete', () => {
    const del = accountsAccess.delete!

    it('allows system admins', async () => {
      await expectAccess(del, systemAdminUser, true)
    })

    it('allows budget admins', async () => {
      await expectAccess(del, workspaceAdminUser, budgetScope)
    })

    it('denies budget members', async () => {
      await expectAccess(del, workspaceMemberUser, false)
    })
  })
})

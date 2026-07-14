import { describe, it } from 'bun:test'

import { transactionsAccess } from '@/access/collections'
import {
  budgetReadonlyUser,
  expectAccess,
  systemAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const budgetScope = { budget: { in: ['budget-a'] } }

describe('transactionsAccess', () => {
  describe('read', () => {
    const read = transactionsAccess.read!

    it('scopes budget members to their budgets', async () => {
      await expectAccess(read, workspaceMemberUser, budgetScope)
    })

    it('allows readonly members to read', async () => {
      await expectAccess(read, budgetReadonlyUser, budgetScope)
    })
  })

  describe.each(['create', 'update', 'delete'] as const)('%s', (operation) => {
    const access = transactionsAccess[operation]!

    it('allows budget writers', async () => {
      await expectAccess(access, workspaceMemberUser, budgetScope)
    })

    it('denies readonly members', async () => {
      await expectAccess(access, budgetReadonlyUser, false)
    })

    it('allows system admins', async () => {
      await expectAccess(access, systemAdminUser, true)
    })
  })
})

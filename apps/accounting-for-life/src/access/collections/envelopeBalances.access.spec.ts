import { describe, it } from 'bun:test'

import { envelopeBalancesAccess } from '@/access/collections'
import {
  budgetReadonlyUser,
  expectAccess,
  systemAdminUser,
  workspaceAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const budgetScope = { budget: { in: ['budget-a'] } }

describe('envelopeBalancesAccess', () => {
  describe.each(['create', 'update'] as const)('%s', (operation) => {
    const access = envelopeBalancesAccess[operation]!

    it('allows system admins full access', async () => {
      await expectAccess(access, systemAdminUser, true)
    })

    it('scopes budget writers to their budgets', async () => {
      await expectAccess(access, workspaceMemberUser, budgetScope)
    })

    it('scopes budget admins to their budgets', async () => {
      await expectAccess(access, workspaceAdminUser, budgetScope)
    })

    it('denies readonly members', async () => {
      await expectAccess(access, budgetReadonlyUser, false)
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

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
const onBudgetA = { data: { budget: 'budget-a' } }
const onBudgetB = { data: { budget: 'budget-b' } }

describe('envelopeBalancesAccess', () => {
  describe('create', () => {
    const create = envelopeBalancesAccess.create!

    it('allows writers for body budget membership', async () => {
      await expectAccess(create, systemAdminUser, true, onBudgetA)
      await expectAccess(create, workspaceMemberUser, true, onBudgetA)
      await expectAccess(create, workspaceAdminUser, true, onBudgetA)
    })

    it('denies other budgets and readonly', async () => {
      await expectAccess(create, workspaceMemberUser, false, onBudgetB)
      await expectAccess(create, budgetReadonlyUser, false, onBudgetA)
    })
  })

  describe('update', () => {
    const update = envelopeBalancesAccess.update!

    it('scopes writers and checks reassigned budget', async () => {
      await expectAccess(update, systemAdminUser, true)
      await expectAccess(update, workspaceMemberUser, budgetScope)
      await expectAccess(update, workspaceAdminUser, budgetScope)
      await expectAccess(update, workspaceMemberUser, false, onBudgetB)
      await expectAccess(update, budgetReadonlyUser, false)
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

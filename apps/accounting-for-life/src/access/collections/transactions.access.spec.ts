import { describe, it } from 'bun:test'

import { transactionsAccess } from '@/access/collections'
import {
  budgetReadonlyUser,
  expectAccess,
  systemAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const budgetScope = { budget: { in: ['budget-a'] } }
const onBudgetA = { data: { budget: 'budget-a' } }
const onBudgetB = { data: { budget: 'budget-b' } }

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

  describe('create', () => {
    const create = transactionsAccess.create!

    it('allows writers for body budget membership', async () => {
      await expectAccess(create, workspaceMemberUser, true, onBudgetA)
      await expectAccess(create, systemAdminUser, true, onBudgetA)
    })

    it('denies other budgets and readonly', async () => {
      await expectAccess(create, workspaceMemberUser, false, onBudgetB)
      await expectAccess(create, budgetReadonlyUser, false, onBudgetA)
    })
  })

  describe('update', () => {
    const update = transactionsAccess.update!

    it('scopes writers and checks reassigned budget', async () => {
      await expectAccess(update, workspaceMemberUser, budgetScope)
      await expectAccess(update, workspaceMemberUser, budgetScope, onBudgetA)
      await expectAccess(update, workspaceMemberUser, false, onBudgetB)
      await expectAccess(update, budgetReadonlyUser, false)
      await expectAccess(update, systemAdminUser, true)
    })
  })

  describe('delete', () => {
    const del = transactionsAccess.delete!

    it('allows budget writers', async () => {
      await expectAccess(del, workspaceMemberUser, budgetScope)
    })

    it('denies readonly members', async () => {
      await expectAccess(del, budgetReadonlyUser, false)
    })

    it('allows system admins', async () => {
      await expectAccess(del, systemAdminUser, true)
    })
  })
})

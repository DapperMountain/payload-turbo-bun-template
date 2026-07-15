import { describe, it } from 'bun:test'

import { transactionsAccess } from '@/access/collections'
import {
  budgetReadonlyUser,
  expectAccess,
  systemAdminUser,
  workspaceAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const memberTransactionScope = {
  and: [
    { budget: { in: ['budget-a'] } },
    {
      or: [
        { 'entryJoin.account.visibility': { equals: 'all_members' } },
        { 'entryJoin.account.visibility': { exists: false } },
        { status: { equals: 'pending' } },
      ],
    },
  ],
}

const adminTransactionScope = {
  or: [{ budget: { in: ['budget-a'] } }, memberTransactionScope],
}

const onBudgetA = { data: { budget: 'budget-a' } }
const onBudgetB = { data: { budget: 'budget-b' } }

describe('transactionsAccess', () => {
  describe('read', () => {
    const read = transactionsAccess.read!

    it('scopes members through visible account legs or pending headers', async () => {
      await expectAccess(read, workspaceMemberUser, memberTransactionScope)
    })

    it('allows readonly members the same visibility filter', async () => {
      await expectAccess(read, budgetReadonlyUser, memberTransactionScope)
    })

    it('gives budget admins full budget access', async () => {
      await expectAccess(read, workspaceAdminUser, adminTransactionScope)
    })

    it('allows system admins full access', async () => {
      await expectAccess(read, systemAdminUser, true)
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
      await expectAccess(update, workspaceMemberUser, { budget: { in: ['budget-a'] } })
      await expectAccess(update, workspaceMemberUser, { budget: { in: ['budget-a'] } }, onBudgetA)
      await expectAccess(update, workspaceMemberUser, false, onBudgetB)
      await expectAccess(update, budgetReadonlyUser, false)
      await expectAccess(update, systemAdminUser, true)
    })
  })

  describe('delete', () => {
    const del = transactionsAccess.delete!

    it('allows budget writers', async () => {
      await expectAccess(del, workspaceMemberUser, { budget: { in: ['budget-a'] } })
    })

    it('denies readonly members', async () => {
      await expectAccess(del, budgetReadonlyUser, false)
    })

    it('allows system admins', async () => {
      await expectAccess(del, systemAdminUser, true)
    })
  })
})

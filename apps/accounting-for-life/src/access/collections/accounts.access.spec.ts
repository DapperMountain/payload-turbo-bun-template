import { describe, it } from 'bun:test'

import { accountsAccess } from '@/access/collections'
import {
  budgetReadonlyUser,
  expectAccess,
  systemAdminUser,
  workspaceAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const memberAccountScope = {
  and: [
    { budget: { in: ['budget-a'] } },
    {
      or: [{ visibility: { equals: 'all_members' } }, { visibility: { exists: false } }],
    },
  ],
}

const adminAccountScope = {
  or: [
    memberAccountScope,
    {
      and: [{ budget: { in: ['budget-a'] } }, { visibility: { equals: 'admins' } }],
    },
  ],
}

const onBudgetA = { data: { budget: 'budget-a' } }
const onBudgetB = { data: { budget: 'budget-b' } }

describe('accountsAccess', () => {
  describe('read', () => {
    const read = accountsAccess.read!

    it('allows system admins full access', async () => {
      await expectAccess(read, systemAdminUser, true)
    })

    it('scopes members to all_members accounts in their budgets', async () => {
      await expectAccess(read, workspaceMemberUser, memberAccountScope)
    })

    it('allows readonly members to read all_members accounts', async () => {
      await expectAccess(read, budgetReadonlyUser, memberAccountScope)
    })

    it('includes admins-only accounts for budget admins', async () => {
      await expectAccess(read, workspaceAdminUser, adminAccountScope)
    })
  })

  describe('create', () => {
    const create = accountsAccess.create!

    it('allows system admins and writers for body budget membership', async () => {
      await expectAccess(create, systemAdminUser, true, onBudgetA)
      await expectAccess(create, workspaceMemberUser, true, onBudgetA)
    })

    it('denies create for other budgets, readonly, or missing budget', async () => {
      await expectAccess(create, workspaceMemberUser, false, onBudgetB)
      await expectAccess(create, budgetReadonlyUser, false, onBudgetA)
      await expectAccess(create, workspaceMemberUser, false)
      await expectAccess(create, null, false, onBudgetA)
    })
  })

  describe('update', () => {
    const update = accountsAccess.update!

    it('scopes writable budgets and checks reassigned body budget', async () => {
      await expectAccess(update, systemAdminUser, true)
      await expectAccess(update, workspaceMemberUser, { budget: { in: ['budget-a'] } })
      await expectAccess(update, workspaceMemberUser, { budget: { in: ['budget-a'] } }, onBudgetA)
      await expectAccess(update, workspaceMemberUser, false, onBudgetB)
      await expectAccess(update, budgetReadonlyUser, false)
    })
  })

  describe('delete', () => {
    const del = accountsAccess.delete!

    it('allows system admins', async () => {
      await expectAccess(del, systemAdminUser, true)
    })

    it('allows budget admins', async () => {
      await expectAccess(del, workspaceAdminUser, { budget: { in: ['budget-a'] } })
    })

    it('denies budget members', async () => {
      await expectAccess(del, workspaceMemberUser, false)
    })
  })
})

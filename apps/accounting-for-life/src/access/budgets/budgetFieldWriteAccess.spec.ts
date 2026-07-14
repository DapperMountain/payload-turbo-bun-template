import { describe, it } from 'bun:test'

import {
  budgetReadonlyUser,
  expectAccess,
  systemAdminUser,
  workspaceMemberUser,
} from '@/access/test'

import { canCreateOnBudget, canUpdateOnBudget } from './budgetFieldWriteAccess'

const budgetScope = { budget: { in: ['budget-a'] } }
const onBudgetA = { data: { budget: 'budget-a' } }
const onBudgetB = { data: { budget: 'budget-b' } }

describe('canCreateOnBudget', () => {
  const create = canCreateOnBudget()

  it('allows writers for a budget they belong to', async () => {
    await expectAccess(create, workspaceMemberUser, true, onBudgetA)
    await expectAccess(create, systemAdminUser, true, onBudgetA)
  })

  it('denies writers for a budget they do not belong to', async () => {
    await expectAccess(create, workspaceMemberUser, false, onBudgetB)
  })

  it('denies readonly members and missing budget', async () => {
    await expectAccess(create, budgetReadonlyUser, false, onBudgetA)
    await expectAccess(create, workspaceMemberUser, false)
    await expectAccess(create, null, false, onBudgetA)
  })
})

describe('canUpdateOnBudget', () => {
  const update = canUpdateOnBudget()

  it('scopes updates to writable budgets when budget is not reassigned', async () => {
    await expectAccess(update, workspaceMemberUser, budgetScope)
    await expectAccess(update, budgetReadonlyUser, false)
  })

  it('allows reassignment only to a writable membership budget', async () => {
    await expectAccess(update, workspaceMemberUser, budgetScope, onBudgetA)
    await expectAccess(update, workspaceMemberUser, false, onBudgetB)
  })
})

import { describe, expect, it } from 'bun:test'

import {
  getUserBudgetIds,
  getUserWritableBudgetIds,
  userBelongsToBudget,
  userHasBudgetRole,
  userIsBudgetAdmin,
} from '@/utils'
import {
  budgetReadonlyUser,
  workspaceAdminUser,
  workspaceMemberUser,
} from '@/access/test'

describe('budget membership utils', () => {
  it('lists budget ids by role', () => {
    expect(getUserBudgetIds(workspaceMemberUser)).toEqual(['budget-a'])
    expect(getUserBudgetIds(workspaceMemberUser, 'BUDGET_ADMIN')).toEqual([])
    expect(getUserBudgetIds(workspaceAdminUser, 'BUDGET_ADMIN')).toEqual(['budget-a'])
    expect(getUserWritableBudgetIds(budgetReadonlyUser)).toEqual([])
    expect(getUserWritableBudgetIds(workspaceMemberUser)).toEqual(['budget-a'])
  })

  it('checks membership and admin helpers', () => {
    expect(userBelongsToBudget(workspaceMemberUser, 'budget-a')).toBe(true)
    expect(userHasBudgetRole(budgetReadonlyUser, 'budget-a', 'BUDGET_READONLY')).toBe(true)
    expect(userIsBudgetAdmin(workspaceAdminUser, 'budget-a')).toBe(true)
    expect(userIsBudgetAdmin(workspaceMemberUser, 'budget-a')).toBe(false)
  })
})

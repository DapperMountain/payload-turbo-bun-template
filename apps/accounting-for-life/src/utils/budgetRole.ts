import type { Budget } from '@/types'

/** Role on a `user.budgets[]` membership row. */
export type BudgetRole = 'BUDGET_ADMIN' | 'BUDGET_MEMBER' | 'BUDGET_READONLY'

/** Roles that may create/update budget content (not read-only). */
export const BUDGET_WRITER_ROLES: readonly BudgetRole[] = ['BUDGET_ADMIN', 'BUDGET_MEMBER']

export type BudgetId = Budget['id']

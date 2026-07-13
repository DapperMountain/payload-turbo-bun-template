import type { Category, CategoryGroup } from '@/types'

export type BudgetMonthParams = {
  year: number
  month: number
}

export type BudgetMonthCategoryRow = {
  id: string
  label: string
  purpose: Category['purpose']
  assigned: number
  activity: number
  available: number
  transactionsHref: string
}

export type BudgetMonthGroupRow = {
  id: string
  name: string
  kind: CategoryGroup['kind']
  categories: BudgetMonthCategoryRow[]
  assignedTotal: number
  activityTotal: number
  availableTotal: number
}

export type BudgetMonthSnapshot = {
  budgetId: string
  month: BudgetMonthParams
  monthLabel: string
  prevMonth: string
  nextMonth: string
  groups: BudgetMonthGroupRow[]
  summary: {
    incomeActivity: number
    expenseActivity: number
    net: number
    expenseAssigned: number
    readyToAssign: number
  }
}

export function categoryAcceptsAssignment(purpose: Category['purpose']): boolean {
  return purpose !== 'income'
}

/** Available balance for spending envelopes (no rollover). */
export function envelopeAvailable(
  purpose: Category['purpose'],
  assigned: number,
  activity: number,
): number {
  if (!categoryAcceptsAssignment(purpose)) {
    return 0
  }

  return assigned - activity
}

/** YNAB-style pool: actual income received minus amounts assigned to spending envelopes. */
export function readyToAssignAmount(incomeActivity: number, expenseAssigned: number): number {
  return incomeActivity - expenseAssigned
}

export function parseBudgetMonth(raw?: string): BudgetMonthParams {
  const now = new Date()
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }

  const [year, month] = raw.split('-').map(Number)
  return { year: year!, month: month! }
}

export function formatBudgetMonthParam({ year, month }: BudgetMonthParams): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function formatBudgetMonthLabel(
  { year, month }: BudgetMonthParams,
  locale?: string,
): string {
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'short',
    year: 'numeric',
  })
}

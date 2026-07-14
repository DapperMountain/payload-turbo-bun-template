import 'server-only'

import type { Payload } from 'payload'

import { filtersSearchParam } from '@/lib/filters/parse'
import { categoryDisplayLabel } from '@/lib/frontend/category-filter-options'
import { dateRangeEndBound, dateRangeStartBound } from '@/lib/frontend/transaction-datetime'
import type {
  BudgetMonthCategoryRow,
  BudgetMonthGroupRow,
  BudgetMonthParams,
  BudgetMonthSnapshot,
} from '@/lib/frontend/budget-month.types'
import {
  categoryAcceptsAssignment,
  displayCategoryActivity,
  envelopeAvailable,
  formatBudgetMonthLabel,
  formatBudgetMonthParam,
  readyToAssignAmount,
} from '@/lib/frontend/budget-month.types'
import type { Category, User } from '@/types'
import { getCollectionId } from '@/utils'

export type {
  BudgetMonthCategoryRow,
  BudgetMonthGroupRow,
  BudgetMonthParams,
  BudgetMonthSnapshot,
} from '@/lib/frontend/budget-month.types'
export {
  categoryAcceptsAssignment,
  displayCategoryActivity,
  envelopeAvailable,
  formatBudgetMonthLabel,
  formatBudgetMonthParam,
  parseBudgetMonth,
  readyToAssignAmount,
} from '@/lib/frontend/budget-month.types'

export function monthDateRange({ year, month }: BudgetMonthParams): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export function shiftBudgetMonth(
  { year, month }: BudgetMonthParams,
  delta: number,
): BudgetMonthParams {
  const date = new Date(year, month - 1 + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

async function activityByCategory(
  payload: Payload,
  options: {
    user: User
    workspaceId: string
    budgetId: string
    start: string
    end: string
  },
): Promise<Map<string, number>> {
  const transactions = await payload.find({
    collection: 'transactions',
    where: {
      and: [
        { workspace: { equals: options.workspaceId } },
        { budget: { equals: options.budgetId } },
        { status: { equals: 'posted' } },
        { date: { greater_than_equal: dateRangeStartBound(options.start) } },
        { date: { less_than_equal: dateRangeEndBound(options.end) } },
      ],
    },
    limit: 5000,
    depth: 0,
    pagination: false,
    user: options.user,
    overrideAccess: false,
  })

  const txIds = transactions.docs.map((tx) => tx.id)
  if (!txIds.length) return new Map()

  const entries = await payload.find({
    collection: 'transaction-entries',
    where: {
      and: [
        { workspace: { equals: options.workspaceId } },
        { transaction: { in: txIds } },
        { category: { exists: true } },
      ],
    },
    limit: 10000,
    depth: 0,
    pagination: false,
    user: options.user,
    overrideAccess: false,
  })

  const totals = new Map<string, number>()
  for (const entry of entries.docs) {
    if (!entry.category) continue
    const categoryId = getCollectionId(entry.category)
    if (!categoryId) continue
    const amount = entry.reportingAmount ?? entry.amount
    totals.set(categoryId, (totals.get(categoryId) ?? 0) + amount)
  }

  return totals
}

async function assignedByCategory(
  payload: Payload,
  options: {
    user: User
    budgetId: string
    year: number
    month: number
  },
): Promise<Map<string, number>> {
  const balances = await payload.find({
    collection: 'envelope-balances',
    where: {
      and: [
        { budget: { equals: options.budgetId } },
        { year: { equals: options.year } },
        { month: { equals: options.month } },
      ],
    },
    limit: 1000,
    depth: 0,
    pagination: false,
    user: options.user,
    overrideAccess: false,
  })

  const assigned = new Map<string, number>()
  for (const balance of balances.docs) {
    const categoryId = getCollectionId(balance.category)
    if (!categoryId) continue
    assigned.set(categoryId, balance.assigned ?? 0)
  }

  return assigned
}

function categoryTransactionsHref(
  budgetId: string,
  categoryId: string,
  month: BudgetMonthParams,
): string {
  const { start, end } = monthDateRange(month)
  const params = filtersSearchParam([
    { id: 'budget', field: 'budget', operator: 'equals', value: budgetId },
    { id: 'date-from', field: 'date', operator: 'greater_than_equal', value: start },
    { id: 'date-to', field: 'date', operator: 'less_than_equal', value: end, logic: 'and' },
    {
      id: 'category',
      field: 'entries.category',
      operator: 'equals',
      value: categoryId,
      logic: 'and',
    },
  ])

  return `/transactions?${new URLSearchParams(params).toString()}`
}

export async function getBudgetMonthSnapshot(
  payload: Payload,
  options: {
    user: User
    workspaceId: string
    budgetId: string
    month: BudgetMonthParams
    locale?: string
  },
): Promise<BudgetMonthSnapshot> {
  const { start, end } = monthDateRange(options.month)

  const [groups, categories, rawActivity, rawAssigned] = await Promise.all([
    payload.find({
      collection: 'category-groups',
      where: { budget: { equals: options.budgetId } },
      sort: 'sortOrder',
      limit: 100,
      depth: 0,
      user: options.user,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'categories',
      where: { budget: { equals: options.budgetId } },
      sort: 'sortOrder',
      limit: 500,
      depth: 0,
      user: options.user,
      overrideAccess: false,
    }),
    activityByCategory(payload, {
      user: options.user,
      workspaceId: options.workspaceId,
      budgetId: options.budgetId,
      start,
      end,
    }),
    assignedByCategory(payload, {
      user: options.user,
      budgetId: options.budgetId,
      year: options.month.year,
      month: options.month.month,
    }),
  ])

  const categoriesByGroup = new Map<string, Category[]>()
  for (const category of categories.docs) {
    const groupId = getCollectionId(category.categoryGroup)
    if (!groupId) continue
    const list = categoriesByGroup.get(groupId) ?? []
    list.push(category)
    categoriesByGroup.set(groupId, list)
  }

  let incomeActivity = 0
  let expenseActivity = 0
  let expenseAssigned = 0

  const groupRows: BudgetMonthGroupRow[] = groups.docs.map((group) => {
    const groupCategories = categoriesByGroup.get(group.id) ?? []
    let activityTotal = 0
    let assignedTotal = 0
    let availableTotal = 0

    const categoryRows: BudgetMonthCategoryRow[] = groupCategories.map((category) => {
      const raw = rawActivity.get(category.id) ?? 0
      const activity = displayCategoryActivity(category.purpose, raw)
      const assignable = categoryAcceptsAssignment(category.purpose)
      const assigned = assignable ? (rawAssigned.get(category.id) ?? 0) : 0
      const available = envelopeAvailable(category.purpose, assigned, activity)

      activityTotal += activity
      if (assignable) {
        assignedTotal += assigned
        availableTotal += available
      }

      if (category.purpose === 'income') {
        incomeActivity += activity
      } else {
        expenseActivity += activity
        // Payment envelopes are funded from spending categories (US-4.4), not from Ready to Assign.
        if (category.purpose !== 'credit_card_payment') {
          expenseAssigned += assigned
        }
      }

      return {
        id: category.id,
        label: categoryDisplayLabel(category),
        purpose: category.purpose,
        assigned,
        activity,
        available,
        transactionsHref: categoryTransactionsHref(options.budgetId, category.id, options.month),
      }
    })

    return {
      id: group.id,
      name: group.name,
      kind: group.kind,
      categories: categoryRows,
      assignedTotal,
      activityTotal,
      availableTotal,
    }
  }).filter((group) => group.kind !== 'income')

  const prev = shiftBudgetMonth(options.month, -1)
  const next = shiftBudgetMonth(options.month, 1)

  return {
    budgetId: options.budgetId,
    month: options.month,
    monthLabel: formatBudgetMonthLabel(options.month, options.locale),
    prevMonth: formatBudgetMonthParam(prev),
    nextMonth: formatBudgetMonthParam(next),
    groups: groupRows,
    summary: {
      incomeActivity,
      expenseActivity,
      net: incomeActivity - expenseActivity,
      expenseAssigned,
      readyToAssign: readyToAssignAmount(incomeActivity, expenseAssigned),
    },
  }
}

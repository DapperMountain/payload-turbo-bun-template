import 'server-only'

import type { Category } from '@/types'
import { getCollectionId } from '@/utils'

import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
export type { RelationshipFilterOption } from '@/lib/filters/relationship-options'

export function categoryDisplayLabel(category: Pick<Category, 'name' | 'emoji'>): string {
  return category.emoji ? `${category.emoji} ${category.name}` : category.name
}

type BudgetNameLookup = Map<string, string> | { id: string; name: string }[]

function budgetNameMap(budgets: BudgetNameLookup): Map<string, string> {
  if (budgets instanceof Map) return budgets
  return new Map(budgets.map((b) => [b.id, b.name]))
}

function sortedBudgetIds(budgets: BudgetNameLookup): string[] {
  const names = budgetNameMap(budgets)
  return [...names.entries()]
    .sort(([, a], [, b]) => a.localeCompare(b))
    .map(([id]) => id)
}

/** Plain category labels for one budget — used when a budget filter is active. */
export function buildScopedCategoryFilterOptions(
  categories: Category[],
  budgetId: string,
): RelationshipFilterOption[] {
  return categories
    .filter((c) => getCollectionId(c.budget) === budgetId)
    .map((category) => ({
      id: category.id,
      label: categoryDisplayLabel(category),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Per-budget option lists for client-side scoping in the filter bar. */
export function buildCategoryOptionsByBudget(
  categories: Category[],
  budgets: BudgetNameLookup,
): Record<string, RelationshipFilterOption[]> {
  const out: Record<string, RelationshipFilterOption[]> = {}

  for (const budgetId of sortedBudgetIds(budgets)) {
    out[budgetId] = buildScopedCategoryFilterOptions(categories, budgetId)
  }

  return out
}

/** Categories grouped under budget headers — no inline budget suffix on labels. */
export function buildGroupedCategoryFilterOptions(
  categories: Category[],
  budgets: BudgetNameLookup,
): RelationshipFilterOption[] {
  const names = budgetNameMap(budgets)
  const result: RelationshipFilterOption[] = []

  for (const budgetId of sortedBudgetIds(budgets)) {
    const budgetName = names.get(budgetId)
    if (!budgetName) continue

    const budgetCategories = categories
      .filter((c) => getCollectionId(c.budget) === budgetId)
      .sort((a, b) => categoryDisplayLabel(a).localeCompare(categoryDisplayLabel(b)))

    for (const category of budgetCategories) {
      result.push({
        id: category.id,
        label: categoryDisplayLabel(category),
        group: budgetName,
      })
    }
  }

  return result
}

/** @deprecated Use {@link buildScopedCategoryFilterOptions} or grouped helpers. */
export function buildCategoryFilterOptions(
  categories: Category[],
  budgets: BudgetNameLookup,
  options?: { budgetId?: string },
): RelationshipFilterOption[] {
  if (options?.budgetId) {
    return buildScopedCategoryFilterOptions(categories, options.budgetId)
  }

  return buildGroupedCategoryFilterOptions(categories, budgets)
}

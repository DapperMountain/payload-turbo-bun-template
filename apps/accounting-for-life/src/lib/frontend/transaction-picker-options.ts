import type { Account, Category } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'

const CLASSIFICATION_ORDER = ['asset', 'liability', 'equity', 'income', 'expense'] as const

const CATEGORY_GROUP_KIND_ORDER: Record<string, number> = {
  income: 0,
  expense: 1,
  credit_card_payments: 2,
}

function categoryLabel(category: Pick<Category, 'name' | 'emoji'>): string {
  return category.emoji ? `${category.emoji} ${category.name}` : category.name
}

function categoryGroupSortKey(category: Category): [number, number, string] {
  const group =
    typeof category.categoryGroup === 'object' && category.categoryGroup
      ? category.categoryGroup
      : null

  const kindOrder = CATEGORY_GROUP_KIND_ORDER[group?.kind ?? 'expense'] ?? 1
  const groupOrder = group?.sortOrder ?? 0
  const groupName = group?.name ?? ''

  return [kindOrder, groupOrder, groupName]
}

export function buildGroupedAccountOptions(
  accounts: Account[],
  budgetId?: string,
): RelationshipFilterOption[] {
  const filtered = budgetId
    ? accounts.filter((account) => getCollectionId(account.budget) === budgetId)
    : accounts

  const result: RelationshipFilterOption[] = []

  for (const classification of CLASSIFICATION_ORDER) {
    const groupAccounts = filtered
      .filter((account) => account.classification === classification)
      .sort((a, b) => a.name.localeCompare(b.name))

    for (const account of groupAccounts) {
      result.push({
        id: account.id,
        label: account.name,
        group: classification,
        accountIcon: {
          subtype: account.subtype,
          classification: account.classification,
        },
      })
    }
  }

  return result
}

export function buildGroupedCategoryOptionsByGroup(
  categories: Category[],
  budgetId?: string,
): RelationshipFilterOption[] {
  const filtered = budgetId
    ? categories.filter((category) => getCollectionId(category.budget) === budgetId)
    : categories

  const items = filtered.map((category) => {
    const group =
      typeof category.categoryGroup === 'object' && category.categoryGroup
        ? category.categoryGroup.name
        : ''

    return { category, group }
  })

  items.sort((a, b) => {
    const [aKind, aOrder, aName] = categoryGroupSortKey(a.category)
    const [bKind, bOrder, bName] = categoryGroupSortKey(b.category)

    if (aKind !== bKind) return aKind - bKind
    if (aOrder !== bOrder) return aOrder - bOrder
    if (aName !== bName) return aName.localeCompare(bName)

    const categoryOrder = (a.category.sortOrder ?? 0) - (b.category.sortOrder ?? 0)
    if (categoryOrder !== 0) return categoryOrder

    return categoryLabel(a.category).localeCompare(categoryLabel(b.category))
  })

  return items.map(({ category, group }) => ({
    id: category.id,
    label: categoryLabel(category),
    group,
  }))
}

export function accountClassificationGroupKey(classification: string): string {
  return `custom:fields:accounts:classification:${classification}`
}

import type { Payload } from 'payload'

import { getCollectionId } from '@/utils'

async function deleteCategoriesForGroup(payload: Payload, groupId: string): Promise<void> {
  const categories = await payload.find({
    collection: 'categories',
    where: { categoryGroup: { equals: groupId } },
    pagination: false,
    overrideAccess: true,
  })

  for (const category of categories.docs) {
    await payload.delete({
      collection: 'categories',
      id: category.id,
      overrideAccess: true,
    })
  }
}

async function deleteCategoryGroupsForBudget(payload: Payload, budgetId: string): Promise<void> {
  const groups = await payload.find({
    collection: 'category-groups',
    where: { budget: { equals: budgetId } },
    pagination: false,
    overrideAccess: true,
  })

  for (const group of groups.docs) {
    await deleteCategoriesForGroup(payload, group.id)
    await payload.delete({
      collection: 'category-groups',
      id: group.id,
      overrideAccess: true,
    })
  }
}

/** Deletes a budget and its category groups + categories. */
export async function deleteBudgetCatalog(
  payload: Payload,
  budgetId: string,
): Promise<void> {
  await deleteCategoryGroupsForBudget(payload, budgetId)
  await payload.delete({
    collection: 'budgets',
    id: budgetId,
    overrideAccess: true,
  })
}

/**
 * Removes duplicate budgets (same workspace + name), keeping the oldest row.
 */
export async function dedupeDuplicateBudgets(payload: Payload): Promise<void> {
  const budgets = await payload.find({
    collection: 'budgets',
    sort: 'createdAt',
    pagination: false,
    overrideAccess: true,
  })

  const keeperByKey = new Map<string, string>()

  for (const budget of budgets.docs) {
    const workspaceId = getCollectionId(budget.workspace)

    if (!workspaceId) {
      continue
    }

    const key = `${workspaceId}:${budget.name}`
    const keeperId = keeperByKey.get(key)

    if (keeperId) {
      await deleteBudgetCatalog(payload, budget.id)
      payload.logger.warn(
        `🧹 [Dedupe] Removed duplicate budget "${budget.name}" (${budget.id}); kept ${keeperId}.`,
      )
      continue
    }

    keeperByKey.set(key, budget.id)
  }
}

/**
 * Removes duplicate category groups (same budget + name) and categories (same group + name).
 */
export async function dedupeDuplicateCategoryCatalog(
  payload: Payload,
  budgetId: string,
): Promise<void> {
  const groups = await payload.find({
    collection: 'category-groups',
    where: { budget: { equals: budgetId } },
    sort: 'createdAt',
    pagination: false,
    overrideAccess: true,
  })

  const keeperGroupByName = new Map<string, string>()

  for (const group of groups.docs) {
    const keeperId = keeperGroupByName.get(group.name)

    if (keeperId) {
      await deleteCategoriesForGroup(payload, group.id)
      await payload.delete({
        collection: 'category-groups',
        id: group.id,
        overrideAccess: true,
      })
      payload.logger.warn(
        `🧹 [Dedupe] Removed duplicate group "${group.name}" on budget ${budgetId}.`,
      )
      continue
    }

    keeperGroupByName.set(group.name, group.id)

    const categories = await payload.find({
      collection: 'categories',
      where: { categoryGroup: { equals: group.id } },
      sort: 'createdAt',
      pagination: false,
      overrideAccess: true,
    })

    const keeperCategoryByName = new Map<string, string>()

    for (const category of categories.docs) {
      const keeperCategoryId = keeperCategoryByName.get(category.name)

      if (keeperCategoryId) {
        await payload.delete({
          collection: 'categories',
          id: category.id,
          overrideAccess: true,
        })
        payload.logger.warn(
          `🧹 [Dedupe] Removed duplicate category "${category.name}" in group "${group.name}".`,
        )
        continue
      }

      keeperCategoryByName.set(category.name, category.id)
    }
  }
}

/**
 * Repairs duplicate budgets and category catalogs across all workspaces.
 */
export async function repairSeedDuplicates(payload: Payload): Promise<void> {
  await dedupeDuplicateBudgets(payload)

  const budgets = await payload.find({
    collection: 'budgets',
    pagination: false,
    overrideAccess: true,
  })

  for (const budget of budgets.docs) {
    await dedupeDuplicateCategoryCatalog(payload, budget.id)
  }
}

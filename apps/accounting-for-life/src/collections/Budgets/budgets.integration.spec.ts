import { describe, expect, it } from 'bun:test'

import type { Budget, Category, CategoryGroup } from '@/types'
import { createWorkspace, deleteResourceById, findResourceByKey, payload } from '@/test'

const EXPECTED_GROUP_COUNT = 10
const EXPECTED_CATEGORY_COUNT = 58

describe('budgets collection', () => {
  let workspaceId: string
  let budgetId: string

  it('creates a workspace and budget with seeded categories', async () => {
    const workspace = await createWorkspace(payload, {
      name: 'Budget Test Workspace',
      description: 'Workspace for budget integration testing',
      domain: 'budget-test.example.com',
    })
    workspaceId = workspace.id

    const budget = await payload.create({
      collection: 'budgets',
      data: {
        name: 'Test Budget',
        isDefault: true,
        workspace: workspaceId,
      },
    })
    budgetId = budget.id

    expect(budget.name).toBe('Test Budget')
    expect(budget.isDefault).toBe(true)
  })

  it('seeds default category groups and categories', async () => {
    const groups = await payload.find({
      collection: 'category-groups',
      where: { budget: { equals: budgetId } },
      sort: 'sortOrder',
      pagination: false,
    })

    expect(groups.totalDocs).toBe(EXPECTED_GROUP_COUNT)
    expect(groups.docs[0]?.name).toBe('Income')
    expect(groups.docs[0]?.kind).toBe('income')

    const categories = await payload.find({
      collection: 'categories',
      where: { budget: { equals: budgetId } },
      pagination: false,
    })

    expect(categories.totalDocs).toBe(EXPECTED_CATEGORY_COUNT)

    const paychecks = categories.docs.find((doc) => doc.name === 'Paychecks') as Category | undefined
    expect(paychecks?.emoji).toBe('💵')
    expect(paychecks?.isSystemDefault).toBe(true)
    expect(paychecks?.purpose).toBe('income')
  })

  it('reads the budget back', async () => {
    const doc = await findResourceByKey<Budget>(payload, 'budgets', 'name', 'Test Budget')
    expect(doc.id).toBe(budgetId)
  })

  it('deletes the budget and related records', async () => {
    const categories = await payload.find({
      collection: 'categories',
      where: { budget: { equals: budgetId } },
      pagination: false,
    })

    for (const category of categories.docs as Category[]) {
      await deleteResourceById(payload, 'categories', category.id)
    }

    const groups = await payload.find({
      collection: 'category-groups',
      where: { budget: { equals: budgetId } },
      pagination: false,
    })

    for (const group of groups.docs as CategoryGroup[]) {
      await deleteResourceById(payload, 'category-groups', group.id)
    }

    await deleteResourceById(payload, 'budgets', budgetId)
    await deleteResourceById(payload, 'workspaces', workspaceId)
  })
})

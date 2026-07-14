import { beforeAll, describe, expect, it } from 'bun:test'

import type { Account, Unit, User } from '@/types'
import { getCollectionId } from '@/utils'
import { loginAs, payload, seedAccessFixtures, type AccessFixtures } from '@/test'

describe('transactions integration', () => {
  let fx: AccessFixtures
  let member: User
  let usd: Unit
  let checkingA: Account
  let checkingB: Account

  beforeAll(async () => {
    fx = await seedAccessFixtures(payload)
    member = await loginAs(payload, fx.emails.workspaceAMember)

    usd = await payload.create({
      collection: 'units',
      data: {
        code: 'USD',
        name: 'US Dollar',
        kind: 'currency',
        decimalPlaces: 2,
        symbol: '$',
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    checkingA = await payload.create({
      collection: 'accounts',
      data: {
        name: 'Checking A',
        classification: 'asset',
        subtype: 'checking',
        unit: usd.id,
        isOnBudget: true,
        budget: fx.budgetA.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    checkingB = await payload.create({
      collection: 'accounts',
      data: {
        name: 'Checking B',
        classification: 'asset',
        subtype: 'checking',
        unit: usd.id,
        isOnBudget: true,
        budget: fx.budgetA.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })
  })

  it('posts an asset transfer between two accounts', async () => {
    const transaction = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-12',
        memo: 'Move to savings',
        type: 'transfer',
        entries: [
          { account: checkingA.id, amount: -100 },
          { account: checkingB.id, amount: 100 },
        ],
      },
    })

    expect(transaction.status).toBe('posted')
    expect(transaction.type).toBe('transfer')

    const entries = await payload.find({
      collection: 'transaction-entries',
      where: { transaction: { equals: transaction.id } },
      sort: 'sortOrder',
      overrideAccess: true,
    })

    expect(entries.totalDocs).toBe(2)
    expect(entries.docs[0]?.amount).toBe(-100)
    expect(entries.docs[1]?.amount).toBe(100)
  })

  it('syncs both transfer legs when one leg amount is updated', async () => {
    const { updatePrimaryAmountInLines } = await import('@/lib/frontend/transactions.display')

    const transaction = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-12',
        memo: 'Resize transfer',
        type: 'transfer',
        entries: [
          { account: checkingA.id, amount: -100, sortOrder: 0 },
          { account: checkingB.id, amount: 100, sortOrder: 1 },
        ],
      },
    })

    const nextLines = updatePrimaryAmountInLines(
      [
        { account: checkingA.id, amount: -100, sortOrder: 0 },
        { account: checkingB.id, amount: 100, sortOrder: 1 },
      ],
      0,
      -250,
    )

    await payload.update({
      collection: 'transactions',
      id: transaction.id,
      user: member,
      overrideAccess: false,
      data: {
        entries: nextLines,
      },
    })

    const entries = await payload.find({
      collection: 'transaction-entries',
      where: { transaction: { equals: transaction.id } },
      sort: 'sortOrder',
      overrideAccess: true,
    })

    expect(entries.totalDocs).toBe(2)
    expect(entries.docs.map((entry) => entry.amount).sort((a, b) => a - b)).toEqual([-250, 250])
    expect(entries.docs.every((entry) => getCollectionId(entry.transaction) === transaction.id)).toBe(
      true,
    )
    expect(entries.docs.every((entry) => !entry.category)).toBe(true)
  })

  it('rejects unbalanced entries', async () => {
    await expect(
      payload.create({
        collection: 'transactions',
        user: member,
        overrideAccess: false,
        data: {
          workspace: fx.workspaceA.id,
          budget: fx.budgetA.id,
          date: '2026-07-12',
          type: 'transfer',
          entries: [
            { account: checkingA.id, amount: -100 },
            { account: checkingB.id, amount: 50 },
          ],
        },
      }),
    ).rejects.toThrow(/sum to zero/)
  })

  it('rejects categories from a different budget on entries', async () => {
    const budgetA2 = await payload.create({
      collection: 'budgets',
      data: {
        name: 'Budget A2',
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    const otherBudgetCategory = await payload.create({
      collection: 'categories',
      data: {
        name: 'Other budget spending',
        purpose: 'spending',
        sortOrder: 0,
        isSystemDefault: false,
        categoryGroup: (
          await payload.create({
            collection: 'category-groups',
            data: {
              name: 'Other',
              kind: 'expense',
              sortOrder: 0,
              budget: budgetA2.id,
              workspace: fx.workspaceA.id,
            },
            overrideAccess: true,
          })
        ).id,
        budget: budgetA2.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    await expect(
      payload.create({
        collection: 'transactions',
        user: member,
        overrideAccess: false,
        data: {
          workspace: fx.workspaceA.id,
          budget: fx.budgetA.id,
          date: '2026-07-12',
          type: 'transaction',
          entries: [
            { account: checkingA.id, amount: -10, category: otherBudgetCategory.id },
            { account: checkingB.id, amount: 10 },
          ],
        },
      }),
    ).rejects.toThrow(/transaction budget/)
  })

  it('updates a posted transaction category via entries', async () => {
    const incomeGroup = await payload.create({
      collection: 'category-groups',
      data: {
        name: 'Test Income',
        kind: 'income',
        sortOrder: 0,
        budget: fx.budgetA.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    const expenseGroup = await payload.create({
      collection: 'category-groups',
      data: {
        name: 'Test Expense',
        kind: 'expense',
        sortOrder: 0,
        budget: fx.budgetA.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    const incomeCategory = await payload.create({
      collection: 'categories',
      data: {
        name: 'Paycheck',
        purpose: 'income',
        sortOrder: 0,
        isSystemDefault: false,
        categoryGroup: incomeGroup.id,
        budget: fx.budgetA.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    const expenseCategory = await payload.create({
      collection: 'categories',
      data: {
        name: 'Groceries',
        purpose: 'spending',
        sortOrder: 0,
        isSystemDefault: false,
        categoryGroup: expenseGroup.id,
        budget: fx.budgetA.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    const transaction = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-12',
        memo: 'Grocery run',
        type: 'transaction',
        entries: [
          { account: checkingA.id, amount: -40, sortOrder: 0 },
          { account: checkingA.id, amount: 40, category: expenseCategory.id, sortOrder: 1 },
        ],
      },
    })

    const updated = await payload.update({
      collection: 'transactions',
      id: transaction.id,
      user: member,
      overrideAccess: false,
      data: {
        memo: 'Updated memo',
        entries: [
          { account: checkingA.id, amount: -40, sortOrder: 0 },
          { account: checkingA.id, amount: 40, category: incomeCategory.id, sortOrder: 1 },
        ],
      },
    })

    expect(updated.memo).toBe('Updated memo')

    const entries = await payload.find({
      collection: 'transaction-entries',
      where: { transaction: { equals: transaction.id } },
      sort: 'sortOrder',
      overrideAccess: true,
    })

    expect(entries.totalDocs).toBe(2)
    const categorized = entries.docs.find((entry) => entry.category)
    expect(getCollectionId(categorized?.category)).toBe(incomeCategory.id)
  })

  it('persists notes when updating a posted transaction with entries', async () => {
    const expenseGroup = await payload.create({
      collection: 'category-groups',
      data: {
        name: 'Notes Expense Group',
        kind: 'expense',
        sortOrder: 0,
        budget: fx.budgetA.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    const expenseCategory = await payload.create({
      collection: 'categories',
      data: {
        name: 'Notes spending',
        purpose: 'spending',
        sortOrder: 0,
        isSystemDefault: false,
        categoryGroup: expenseGroup.id,
        budget: fx.budgetA.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    const transaction = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-12',
        memo: 'Coffee',
        type: 'transaction',
        entries: [
          { account: checkingA.id, amount: -6, sortOrder: 0 },
          { account: checkingA.id, amount: 6, category: expenseCategory.id, sortOrder: 1 },
        ],
      },
    })

    const updated = await payload.update({
      collection: 'transactions',
      id: transaction.id,
      user: member,
      overrideAccess: false,
      data: {
        notes: 'Paid with checking',
        entries: [
          { account: checkingA.id, amount: -6, sortOrder: 0 },
          { account: checkingA.id, amount: 6, category: expenseCategory.id, sortOrder: 1 },
        ],
      },
    })

    expect(updated.notes).toBe('Paid with checking')

    const refetch = await payload.findByID({
      collection: 'transactions',
      id: transaction.id,
      depth: 0,
      user: member,
      overrideAccess: false,
    })

    expect(refetch.notes).toBe('Paid with checking')
  })

  it('allows workspace members to mark transactions pending in bulk', async () => {
    const first = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-12',
        type: 'transfer',
        entries: [
          { account: checkingA.id, amount: -25 },
          { account: checkingB.id, amount: 25 },
        ],
      },
    })

    const result = await payload.update({
      collection: 'transactions',
      where: {
        and: [
          { workspace: { equals: fx.workspaceA.id } },
          { id: { equals: first.id } },
        ],
      },
      data: { status: 'pending' },
      user: member,
      overrideAccess: false,
      depth: 0,
    })

    expect(result.docs).toHaveLength(1)
    expect(result.docs[0]?.status).toBe('pending')
  })

  it('allows workspace members to delete a posted transaction and its entries', async () => {
    const transaction = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-14',
        type: 'transfer',
        entries: [
          { account: checkingA.id, amount: -15 },
          { account: checkingB.id, amount: 15 },
        ],
      },
    })

    const entriesBefore = await payload.find({
      collection: 'transaction-entries',
      where: { transaction: { equals: transaction.id } },
      overrideAccess: true,
    })

    expect(entriesBefore.totalDocs).toBe(2)

    await payload.delete({
      collection: 'transactions',
      id: transaction.id,
      user: member,
      overrideAccess: false,
      depth: 0,
    })

    const entriesAfter = await payload.find({
      collection: 'transaction-entries',
      where: { transaction: { equals: transaction.id } },
      overrideAccess: true,
    })

    expect(entriesAfter.totalDocs).toBe(0)

    await expect(
      payload.findByID({
        collection: 'transactions',
        id: transaction.id,
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })

  it('creates a payment category when adding a credit card account', async () => {
    const card = await payload.create({
      collection: 'accounts',
      data: {
        name: 'Visa',
        classification: 'liability',
        subtype: 'credit_card',
        unit: usd.id,
        isOnBudget: true,
        budget: fx.budgetA.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
      depth: 1,
    })

    const categoryId = typeof card.category === 'string' ? card.category : card.category?.id
    expect(categoryId).toBeDefined()

    const category = await payload.findByID({
      collection: 'categories',
      id: categoryId!,
      overrideAccess: true,
    })

    expect(category.purpose).toBe('credit_card_payment')
  })
})

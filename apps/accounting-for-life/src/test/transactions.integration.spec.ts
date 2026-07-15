import { beforeAll, describe, expect, it } from 'bun:test'

import { matchAndMergeTransactions } from '@/collections/Transactions/lib/matchAndMergeTransactions'
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
        kind: 'fiat',
        decimalPlaces: 2,
        symbol: '$',
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    await payload.update({
      collection: 'workspaces',
      id: fx.workspaceA.id,
      data: { reportingCurrency: usd.id },
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
        payee: 'Move to savings',
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
        payee: 'Resize transfer',
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
        payee: 'Grocery run',
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
        payee: 'Updated payee',
        // Flip payment/category signs — income category legs must be credits.
        entries: [
          { account: checkingA.id, amount: 40, sortOrder: 0 },
          { account: checkingA.id, amount: -40, category: incomeCategory.id, sortOrder: 1 },
        ],
      },
    })

    expect(updated.payee).toBe('Updated payee')

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
        payee: 'Coffee',
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

  it('funds the credit card payment envelope when spending on a credit card', async () => {
    const card = await payload.create({
      collection: 'accounts',
      data: {
        name: 'Rewards Visa',
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

    const paymentCategoryId =
      typeof card.category === 'string' ? card.category : card.category?.id
    expect(paymentCategoryId).toBeDefined()

    const expenseGroup = await payload.create({
      collection: 'category-groups',
      data: {
        name: 'CC Spend Group',
        kind: 'expense',
        sortOrder: 0,
        budget: fx.budgetA.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    const groceries = await payload.create({
      collection: 'categories',
      data: {
        name: 'CC Groceries',
        purpose: 'spending',
        sortOrder: 0,
        isSystemDefault: false,
        categoryGroup: expenseGroup.id,
        budget: fx.budgetA.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    const year = 2026
    const month = 7

    const transaction = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: `${year}-07-15`,
        type: 'transaction',
        entries: [
          { account: card.id, amount: 50, sortOrder: 0 },
          { account: card.id, amount: -50, category: groceries.id, sortOrder: 1 },
        ],
      },
    })

    const funded = await payload.find({
      collection: 'envelope-balances',
      where: {
        and: [
          { budget: { equals: fx.budgetA.id } },
          { category: { equals: paymentCategoryId! } },
          { year: { equals: year } },
          { month: { equals: month } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })

    expect(funded.totalDocs).toBe(1)
    expect(Number(funded.docs[0]?.assigned)).toBe(50)

    await payload.update({
      collection: 'transactions',
      id: transaction.id,
      user: member,
      overrideAccess: false,
      data: {
        entries: [
          { account: card.id, amount: 30, sortOrder: 0 },
          { account: card.id, amount: -30, category: groceries.id, sortOrder: 1 },
        ],
      },
    })

    const afterUpdate = await payload.find({
      collection: 'envelope-balances',
      where: {
        and: [
          { budget: { equals: fx.budgetA.id } },
          { category: { equals: paymentCategoryId! } },
          { year: { equals: year } },
          { month: { equals: month } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })

    expect(Number(afterUpdate.docs[0]?.assigned)).toBe(30)

    await payload.delete({
      collection: 'transactions',
      id: transaction.id,
      user: member,
      overrideAccess: false,
      depth: 0,
    })

    const afterDelete = await payload.find({
      collection: 'envelope-balances',
      where: {
        and: [
          { budget: { equals: fx.budgetA.id } },
          { category: { equals: paymentCategoryId! } },
          { year: { equals: year } },
          { month: { equals: month } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })

    expect(Number(afterDelete.docs[0]?.assigned ?? 0)).toBe(0)
  })

  it('does not fund payment envelopes for checking-to-credit-card transfers', async () => {
    const card = await payload.create({
      collection: 'accounts',
      data: {
        name: 'Paydown Visa',
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

    const paymentCategoryId =
      typeof card.category === 'string' ? card.category : card.category?.id
    expect(paymentCategoryId).toBeDefined()

    await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-16',
        type: 'transfer',
        entries: [
          { account: checkingA.id, amount: -100 },
          { account: card.id, amount: 100 },
        ],
      },
    })

    const envelopes = await payload.find({
      collection: 'envelope-balances',
      where: {
        and: [
          { budget: { equals: fx.budgetA.id } },
          { category: { equals: paymentCategoryId! } },
        ],
      },
      limit: 5,
      overrideAccess: true,
    })

    expect(envelopes.totalDocs).toBe(0)
  })

  it('snapshots identity FX when the account unit matches reporting currency', async () => {
    const transaction = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-12',
        payee: 'USD transfer with FX snapshot',
        type: 'transfer',
        entries: [
          { account: checkingA.id, amount: -25 },
          { account: checkingB.id, amount: 25 },
        ],
      },
    })

    const legs = await payload.find({
      collection: 'transaction-entries',
      where: { transaction: { equals: transaction.id } },
      sort: 'sortOrder',
      overrideAccess: true,
    })

    expect(legs.docs).toHaveLength(2)
    for (const leg of legs.docs) {
      expect(leg.fxRate).toBe(1)
      expect(leg.reportingAmount).toBe(leg.amount)
    }
  })

  it('requires fxRate and persists reportingAmount for cross-currency legs', async () => {
    const eur = await payload.create({
      collection: 'units',
      data: {
        code: 'EUR',
        name: 'Euro',
        kind: 'fiat',
        decimalPlaces: 2,
        symbol: '€',
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    const eurChecking = await payload.create({
      collection: 'accounts',
      data: {
        name: 'EUR Checking',
        classification: 'asset',
        subtype: 'checking',
        unit: eur.id,
        isOnBudget: true,
        budget: fx.budgetA.id,
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
          payee: 'Missing FX',
          type: 'transfer',
          entries: [
            { account: eurChecking.id, amount: -10 },
            { account: checkingA.id, amount: 10 },
          ],
        },
      }),
    ).rejects.toThrow(/fxRate is required/)

    const transaction = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-12',
        payee: 'EUR to USD with rate',
        type: 'transfer',
        entries: [
          { account: eurChecking.id, amount: -10, fxRate: 1.1 },
          { account: checkingA.id, amount: 11 },
        ],
      },
    })

    const legs = await payload.find({
      collection: 'transaction-entries',
      where: { transaction: { equals: transaction.id } },
      sort: 'sortOrder',
      overrideAccess: true,
    })

    const eurLeg = legs.docs.find((leg) => getCollectionId(leg.account) === eurChecking.id)
    const usdLeg = legs.docs.find((leg) => getCollectionId(leg.account) === checkingA.id)

    expect(eurLeg?.fxRate).toBe(1.1)
    expect(eurLeg?.reportingAmount).toBe(-11)
    expect(usdLeg?.fxRate).toBe(1)
    expect(usdLeg?.reportingAmount).toBe(11)

    const reportingTotal = legs.docs.reduce((sum, leg) => sum + (leg.reportingAmount ?? 0), 0)
    expect(Math.abs(reportingTotal)).toBeLessThan(1e-9)
  })

  it('posts a mixed-currency multi-leg journal with a fee balancing in reporting currency', async () => {
    const btc = await payload.create({
      collection: 'units',
      data: {
        code: 'BTC',
        name: 'Bitcoin',
        kind: 'crypto',
        decimalPlaces: 8,
        symbol: '₿',
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    const btcWallet = await payload.create({
      collection: 'accounts',
      data: {
        name: 'BTC Wallet',
        classification: 'asset',
        subtype: 'holding',
        unit: btc.id,
        isOnBudget: true,
        budget: fx.budgetA.id,
        workspace: fx.workspaceA.id,
      },
      overrideAccess: true,
    })

    const feeExpense = await payload.create({
      collection: 'accounts',
      data: {
        name: 'Exchange Fees',
        classification: 'expense',
        subtype: 'other',
        unit: usd.id,
        isOnBudget: true,
        budget: fx.budgetA.id,
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
          payee: 'Unbalanced swap',
          type: 'transaction',
          entries: [
            { account: btcWallet.id, amount: -0.01, fxRate: 50_000 },
            { account: checkingA.id, amount: 500 },
            { account: feeExpense.id, amount: 5 },
          ],
        },
      }),
    ).rejects.toThrow(/reporting amounts must sum to zero/)

    const transaction = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-12',
        payee: 'Sell BTC with fee',
        type: 'transaction',
        entries: [
          { account: btcWallet.id, amount: -0.01, fxRate: 50_000 },
          { account: checkingA.id, amount: 495 },
          { account: feeExpense.id, amount: 5 },
        ],
      },
    })

    const legs = await payload.find({
      collection: 'transaction-entries',
      where: { transaction: { equals: transaction.id } },
      sort: 'sortOrder',
      overrideAccess: true,
    })

    expect(legs.docs).toHaveLength(3)
    const reportingTotal = legs.docs.reduce((sum, leg) => sum + (leg.reportingAmount ?? 0), 0)
    expect(Math.abs(reportingTotal)).toBeLessThan(1e-9)

    const btcLeg = legs.docs.find((leg) => getCollectionId(leg.account) === btcWallet.id)
    expect(btcLeg?.fxRate).toBe(50_000)
    expect(btcLeg?.reportingAmount).toBe(-500)
  })

  it('rejects duplicate externalId within a workspace (US-6.2)', async () => {
    const first = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-12',
        payee: 'Imported A',
        type: 'transaction',
        source: 'import',
        externalId: 'plaid:txn-100',
        importBatch: 'batch-2026-07-12',
        entries: [
          { account: checkingA.id, amount: -20 },
          { account: checkingB.id, amount: 20 },
        ],
      },
    })

    expect(first.externalId).toBe('plaid:txn-100')
    expect(first.source).toBe('import')
    expect(first.importBatch).toBe('batch-2026-07-12')

    await expect(
      payload.create({
        collection: 'transactions',
        user: member,
        overrideAccess: false,
        data: {
          workspace: fx.workspaceA.id,
          budget: fx.budgetA.id,
          date: '2026-07-12',
          payee: 'Imported duplicate',
          type: 'transaction',
          source: 'import',
          externalId: 'plaid:txn-100',
          entries: [
            { account: checkingA.id, amount: -5 },
            { account: checkingB.id, amount: 5 },
          ],
        },
      }),
    ).rejects.toThrow(/externalId/)
  })

  it('matches manual and imported transactions then deletes the import (US-6.1)', async () => {
    const manual = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-10',
        payee: 'Starbucks',
        notes: 'Team coffee',
        type: 'transaction',
        source: 'manual',
        status: 'pending',
      },
    })

    const imported = await payload.create({
      collection: 'transactions',
      user: member,
      overrideAccess: false,
      data: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-11T15:00:00.000Z',
        payee: 'STARBUCKS STORE 123',
        type: 'transaction',
        source: 'import',
        externalId: 'plaid:match-200',
        importBatch: 'batch-match',
        entries: [
          { account: checkingA.id, amount: -12.5 },
          { account: checkingB.id, amount: 12.5 },
        ],
      },
    })

    const result = await matchAndMergeTransactions({
      payload,
      user: member,
      ids: [imported.id, manual.id],
      overrideAccess: false,
    })

    expect(result.keptId).toBe(manual.id)
    expect(result.deletedId).toBe(imported.id)

    const kept = await payload.findByID({
      collection: 'transactions',
      id: manual.id,
      depth: 2,
      overrideAccess: true,
    })

    expect(kept.source).toBe('import')
    expect(kept.externalId).toBe('plaid:match-200')
    expect(kept.importBatch).toBe('batch-match')
    expect(kept.payee).toBe('Starbucks')
    expect(kept.notes).toBe('Team coffee')
    expect(kept.status).toBe('posted')
    expect(kept.date).toContain('2026-07-11')

    await expect(
      payload.findByID({
        collection: 'transactions',
        id: imported.id,
        overrideAccess: true,
      }),
    ).rejects.toThrow()

    const legs = await payload.find({
      collection: 'transaction-entries',
      where: { transaction: { equals: manual.id } },
      overrideAccess: true,
    })
    expect(legs.totalDocs).toBe(2)
  })
})

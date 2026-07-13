import { beforeAll, describe, expect, it } from 'bun:test'

import { postJournalEntry } from '@/ledger'
import type { Account, Unit, User } from '@/types'
import { loginAs, payload, seedAccessFixtures, type AccessFixtures } from '@/test'

describe('ledger integration', () => {
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
    const entry = await postJournalEntry({
      payload,
      user: member,
      input: {
        workspace: fx.workspaceA.id,
        budget: fx.budgetA.id,
        date: '2026-07-12',
        memo: 'Move to savings',
        type: 'transfer',
        lines: [
          { account: checkingA.id, amount: -100 },
          { account: checkingB.id, amount: 100 },
        ],
      },
    })

    expect(entry.status).toBe('posted')
    expect(entry.type).toBe('transfer')

    const lines = await payload.find({
      collection: 'journal-lines',
      where: { entry: { equals: entry.id } },
      sort: 'sortOrder',
      overrideAccess: true,
    })

    expect(lines.totalDocs).toBe(2)
    expect(lines.docs[0]?.amount).toBe(-100)
    expect(lines.docs[1]?.amount).toBe(100)
  })

  it('rejects unbalanced transfer lines', async () => {
    await expect(
      postJournalEntry({
        payload,
        user: member,
        input: {
          workspace: fx.workspaceA.id,
          budget: fx.budgetA.id,
          date: '2026-07-12',
          type: 'transfer',
          lines: [
            { account: checkingA.id, amount: -100 },
            { account: checkingB.id, amount: 50 },
          ],
        },
      }),
    ).rejects.toThrow(/sum to zero/)
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

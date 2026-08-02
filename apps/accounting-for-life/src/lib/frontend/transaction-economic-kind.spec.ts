import { describe, expect, it } from 'bun:test'

import type { Account, Category } from '@/types'

import { deriveEconomicKind } from './transaction-economic-kind'

function account(
  id: string,
  subtype: Account['subtype'],
  unit: string,
  classification: Account['classification'] = 'asset',
): Account {
  return {
    id,
    name: id,
    classification,
    subtype,
    unit,
    visibility: 'all_members',
    budget: 'budget-1',
    updatedAt: '',
    createdAt: '',
  }
}

const usd = 'unit-usd'
const btc = 'unit-btc'
const xrp = 'unit-xrp'
const xlm = 'unit-xlm'

const accounts: Account[] = [
  account('checking', 'checking', usd),
  account('savings', 'savings', usd),
  account('btc', 'holding', btc),
  account('xrp', 'holding', xrp),
  account('xlm', 'holding', xlm),
  account('card', 'credit_card', usd, 'liability'),
]

const categories: Category[] = [
  {
    id: 'groceries',
    name: 'Groceries',
    purpose: 'expense',
    budget: 'budget-1',
    updatedAt: '',
    createdAt: '',
  },
  {
    id: 'salary',
    name: 'Salary',
    purpose: 'income',
    budget: 'budget-1',
    updatedAt: '',
    createdAt: '',
  },
]

describe('deriveEconomicKind', () => {
  it('labels categorized spending and income with certainty', () => {
    expect(
      deriveEconomicKind({
        entries: [
          { account: 'checking', amount: -40, category: null },
          { account: 'checking', amount: 40, category: 'groceries' },
        ],
        accounts,
        categories,
      }),
    ).toMatchObject({ kind: 'spend', confidence: 'certain' })

    expect(
      deriveEconomicKind({
        entries: [
          { account: 'checking', amount: 100, category: null },
          { account: 'checking', amount: -100, category: 'salary' },
        ],
        accounts,
        categories,
      }),
    ).toMatchObject({ kind: 'earn', confidence: 'certain' })
  })

  it('labels same-unit wallet moves as transfer (withdraw/deposit with viewpoint)', () => {
    const entries = [
      { account: 'checking', amount: -100, category: null },
      { account: 'savings', amount: 100, category: null },
    ]

    expect(deriveEconomicKind({ entries, accounts, reportingCurrencyId: usd })).toMatchObject({
      kind: 'transfer',
      confidence: 'certain',
    })

    expect(
      deriveEconomicKind({
        entries,
        accounts,
        reportingCurrencyId: usd,
        viewpointAccountId: 'checking',
        viewpointAmount: -100,
      }).kind,
    ).toBe('withdraw')

    expect(
      deriveEconomicKind({
        entries,
        accounts,
        reportingCurrencyId: usd,
        viewpointAccountId: 'savings',
        viewpointAmount: 100,
      }).kind,
    ).toBe('deposit')
  })

  it('keeps crypto↔crypto as a certain transfer', () => {
    expect(
      deriveEconomicKind({
        entries: [
          { account: 'xrp', amount: -100, category: null },
          { account: 'xlm', amount: 200, category: null },
        ],
        accounts,
        reportingCurrencyId: usd,
      }),
    ).toMatchObject({ kind: 'transfer', confidence: 'certain' })
  })

  it('marks cash↔holding as ambiguous buy/sell with choices', () => {
    const sell = deriveEconomicKind({
      entries: [
        { account: 'btc', amount: -0.01, category: null },
        { account: 'checking', amount: 500, category: null },
      ],
      accounts,
      reportingCurrencyId: usd,
    })
    expect(sell).toMatchObject({
      kind: 'sell',
      confidence: 'ambiguous',
      choices: ['buy', 'sell', 'transfer'],
    })

    const buy = deriveEconomicKind({
      entries: [
        { account: 'checking', amount: -500, category: null },
        { account: 'btc', amount: 0.01, category: null },
      ],
      accounts,
      reportingCurrencyId: usd,
    })
    expect(buy.kind).toBe('buy')
    expect(buy.confidence).toBe('ambiguous')
  })

  it('honors a persisted override', () => {
    expect(
      deriveEconomicKind({
        entries: [
          { account: 'btc', amount: -0.01, category: null },
          { account: 'checking', amount: 500, category: null },
        ],
        accounts,
        reportingCurrencyId: usd,
        override: 'transfer',
      }),
    ).toMatchObject({ kind: 'transfer', confidence: 'certain' })
  })

  it('labels credit-card payments as transfers', () => {
    expect(
      deriveEconomicKind({
        entries: [
          { account: 'checking', amount: -100, category: null },
          { account: 'card', amount: 100, category: null },
        ],
        accounts,
        reportingCurrencyId: usd,
      }).kind,
    ).toBe('transfer')
  })
})

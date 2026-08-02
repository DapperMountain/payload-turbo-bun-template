import { describe, expect, it } from 'bun:test'

import type { Account } from '@/types'

import {
  compileSwapFxFromAmounts,
  applySwapPairNote,
  clearSwapPairCategories,
  detectSwapPairFromLegs,
  resolveSwapPairFromKeys,
  swapPairNote,
  entriesPreferSwapView,
  entriesToSwapLegs,
  isSwapFormBalanced,
  isWalletTransferEntries,
  displayIndexesForSwapExtras,
  headerPayeeFromSwapLegs,
  orderLegsGiveReceiveFirst,
  resolveTypeFromSwapLegs,
  swapLegsHaveCounterparties,
  swapLegsToEntries,
  transactionQuotePayloadFromLegs,
  type SwapLegDraft,
} from './transaction-swap'

function account(
  id: string,
  unit: string,
  classification: Account['classification'] = 'asset',
): Account {
  return {
    id,
    name: id,
    classification,
    subtype: 'checking',
    unit,
    visibility: 'all_members',
    budget: 'budget-1',
    updatedAt: '',
    createdAt: '',
  }
}

function leg(
  partial: Pick<SwapLegDraft, 'key' | 'account' | 'amount'> &
    Partial<Omit<SwapLegDraft, 'key' | 'account' | 'amount'>>,
): SwapLegDraft {
  return {
    category: '',
    payee: '',
    notes: '',
    ...partial,
  }
}

const usdReporting = 'unit-usd'
const accounts: Account[] = [
  account('btc', 'unit-btc'),
  account('usd', 'unit-usd'),
  account('fee', 'unit-usd', 'expense'),
  account('eur', 'unit-eur'),
  account('xrp', 'unit-xrp'),
  account('xlm', 'unit-xlm'),
  account('xrp-fee', 'unit-xrp', 'expense'),
]

describe('transaction-swap', () => {
  it('implies BTC→USD from amounts when USD is on the form (no typed price)', () => {
    const legs = [
      leg({ key: '1', account: 'btc', amount: '-0.01' }),
      leg({ key: '2', account: 'usd', amount: '495' }),
      leg({ key: '3', account: 'fee', amount: '5' }),
    ]

    expect(isSwapFormBalanced(legs, accounts, usdReporting)).toBe(true)
    expect(resolveTypeFromSwapLegs(legs, accounts)).toBe('transaction')
    expect(swapLegsToEntries(legs, accounts, usdReporting)).toEqual([
      { account: 'btc', amount: -0.01, category: undefined, sortOrder: 0, fxRate: 50000 },
      { account: 'usd', amount: 495, category: undefined, sortOrder: 1 },
      { account: 'fee', amount: 5, category: undefined, sortOrder: 2 },
    ])
    expect(transactionQuotePayloadFromLegs(legs, accounts, usdReporting)).toEqual({
      quoteUnit: null,
      quoteToReportingRate: null,
    })
  })

  it('balances a crypto swap in the give unit and defers USD reporting', () => {
    const legs = [
      leg({ key: '1', account: 'xrp', amount: '-100' }),
      leg({ key: '2', account: 'xlm', amount: '200' }),
      leg({ key: '3', account: 'xrp-fee', amount: '1' }),
    ]

    const compiled = compileSwapFxFromAmounts(legs, accounts, usdReporting)
    expect(compiled?.quoteUnitId).toBe('unit-xrp')
    expect(compiled?.quoteToReportingRate).toBeNull()
    expect(compiled?.rateByUnitId.get('unit-xlm')).toBeCloseTo(0.495)

    expect(isSwapFormBalanced(legs, accounts, usdReporting)).toBe(true)
    expect(swapLegsToEntries(legs, accounts, usdReporting)).toEqual([
      { account: 'xrp', amount: -100, category: undefined, sortOrder: 0 },
      { account: 'xlm', amount: 200, category: undefined, sortOrder: 1, fxRate: 0.495 },
      { account: 'xrp-fee', amount: 1, category: undefined, sortOrder: 2 },
    ])
    expect(transactionQuotePayloadFromLegs(legs, accounts, usdReporting)).toEqual({
      quoteUnit: 'unit-xrp',
      quoteToReportingRate: null,
    })
  })

  it('always balances two distinct units by implying the cross rate from amounts', () => {
    // −10 EUR + 10 USD implies 1 USD/EUR — balanced by construction (no market rate typed).
    const legs = [
      leg({ key: '1', account: 'eur', amount: '-10' }),
      leg({ key: '2', account: 'usd', amount: '10' }),
    ]
    expect(isSwapFormBalanced(legs, accounts, usdReporting)).toBe(true)
    expect(swapLegsToEntries(legs, accounts, usdReporting)[0]?.fxRate).toBe(1)
    expect(resolveTypeFromSwapLegs(legs, accounts)).toBe('transfer')
  })

  it('treats a categorized two-leg book as a transaction, not a wallet transfer', () => {
    const legs = [
      leg({ key: '1', account: 'usd', amount: '-50', category: 'groceries' }),
      leg({ key: '2', account: 'savings', amount: '50' }),
    ]
    expect(resolveTypeFromSwapLegs(legs, accounts)).toBe('transaction')
    expect(
      isWalletTransferEntries([
        { account: 'usd', amount: -50, category: 'groceries', fxRate: null },
        { account: 'savings', amount: 50, category: null, fxRate: null },
      ]),
    ).toBe(false)
  })

  it('shows all swap other-lines (classical cash + P&L fees have no twins to hide)', () => {
    const legs = [
      leg({ key: 'give', account: 'xrp', amount: '-100' }),
      leg({ key: 'recv', account: 'xlm', amount: '200' }),
      leg({ key: 'pay', account: 'usd', amount: '-5' }),
      leg({
        key: 'fee',
        account: 'budget-expenses',
        amount: '5',
        category: 'fees',
        payee: 'Kraken',
      }),
    ]
    expect(displayIndexesForSwapExtras(legs, [2, 3])).toEqual([2, 3])
  })

  it('does not promote a fee-line merchant to the swap header payee', () => {
    const legs = [
      leg({ key: 'give', account: 'btc', amount: '-1' }),
      leg({ key: 'recv', account: 'usd', amount: '100' }),
      leg({ key: 'fee', account: 'fee', amount: '5', payee: 'Kraken' }),
    ]
    // Leave an existing exchange header alone (undefined = no sync).
    expect(headerPayeeFromSwapLegs(legs, accounts)).toBeUndefined()
  })

  it('requires account or merchant on each leg and merchant on categorized legs', () => {
    expect(
      swapLegsHaveCounterparties([
        leg({ key: 'give', account: 'btc', amount: '-1' }),
        leg({ key: 'recv', account: 'usd', amount: '100' }),
      ]),
    ).toBe(true)

    expect(
      swapLegsHaveCounterparties([
        leg({ key: 'give', account: '', amount: '-1', payee: 'Uniswap' }),
        leg({ key: 'recv', account: 'usd', amount: '100' }),
      ]),
    ).toBe(true)

    expect(
      swapLegsHaveCounterparties([
        leg({ key: 'give', account: 'btc', amount: '-1' }),
        leg({ key: 'fee', account: 'fee', amount: '5', category: 'fees', payee: '' }),
      ]),
    ).toBe(false)

    expect(() =>
      swapLegsToEntries(
        [
          leg({ key: '1', account: 'btc', amount: '-0.01' }),
          leg({ key: '2', account: 'usd', amount: '495' }),
          leg({ key: '3', account: 'fee', amount: '5', category: 'fees', payee: '' }),
        ],
        accounts,
        usdReporting,
      ),
    ).toThrow(/Each line needs a payee or account|Each categorized line needs a payee/)
  })

  it('clears categories from the swap pair but keeps DEX/merchant payees', () => {
    const legs = [
      leg({ key: '1', account: 'btc', amount: '-0.01', category: 'oops', payee: 'Uniswap' }),
      leg({ key: '2', account: 'usd', amount: '500', category: 'also-oops', payee: '' }),
      leg({
        key: '3',
        account: 'fee',
        amount: '5',
        category: 'fees-cat',
        payee: 'ATM Co',
      }),
    ]
    const pair = { giveIndex: 0, receiveIndex: 1, otherIndexes: [2] }
    const next = clearSwapPairCategories(legs, pair)
    expect(next[0]?.category).toBe('')
    expect(next[0]?.payee).toBe('Uniswap')
    expect(next[1]?.category).toBe('')
    expect(next[2]?.category).toBe('fees-cat')
    expect(next[2]?.payee).toBe('ATM Co')
    expect(clearSwapPairCategories(next, pair)).toBe(next)
  })

  it('round-trips merchant payee on journal other lines', () => {
    const entries = [
      { account: 'btc', amount: -0.01, fxRate: 50000, category: null, payee: undefined },
      { account: 'usd', amount: 495, fxRate: 1, category: null, payee: undefined },
      {
        account: 'fee',
        amount: 5,
        fxRate: 1,
        category: 'fees-cat',
        payee: 'ATM Co',
      },
    ]
    const legs = entriesToSwapLegs(entries)
    expect(legs[2]?.payee).toBe('ATM Co')
    const posted = swapLegsToEntries(legs, accounts, usdReporting)
    expect(posted[2]?.payee).toBe('ATM Co')
    expect(posted[0]?.payee).toBeUndefined()
  })

  it('rejects same-unit journals that do not sum to zero', () => {
    const legs = [
      leg({ key: '1', account: 'usd', amount: '-10' }),
      leg({ key: '2', account: 'fee', amount: '5' }),
    ]
    expect(isSwapFormBalanced(legs, accounts, usdReporting)).toBe(false)
  })

  it('round-trips entries to swap legs', () => {
    const entries = [
      { account: 'btc', amount: -0.01, fxRate: 50000, category: null },
      { account: 'usd', amount: 495, fxRate: 1, category: null },
      { account: 'fee', amount: 5, fxRate: 1, category: null },
    ]
    const legs = entriesToSwapLegs(entries)
    expect(legs).toHaveLength(3)
    expect(legs[0]?.amount).toBe('-0.01')
    expect(entriesPreferSwapView(entries, accounts, usdReporting)).toBe(true)
  })

  it('does not force journal for a two-leg cross-unit wallet exchange', () => {
    const entries = [
      { account: 'btc', amount: -0.01, fxRate: 50000, category: null },
      { account: 'usd', amount: 500, fxRate: 1, category: null },
    ]
    // BTC→USD uses the exchange (give/receive) body, not the journal.
    expect(entriesPreferSwapView(entries, accounts, usdReporting)).toBe(false)
  })

  it('orders legs as give, receive, then extras', () => {
    const legs = [
      leg({ key: 'fee', account: 'fee', amount: '5' }),
      leg({ key: 'in', account: 'usd', amount: '100' }),
      leg({ key: 'out', account: 'btc', amount: '-1' }),
    ]
    const ordered = orderLegsGiveReceiveFirst(legs, accounts)
    expect(ordered.map((entry) => entry.key)).toEqual(['out', 'in', 'fee'])
  })

  it('keeps a pinned swap pair by leg keys across edits', () => {
    const legs = [
      leg({ key: 'xrp', account: 'btc', amount: '-1' }),
      leg({ key: 'xlm', account: 'usd', amount: '100' }),
      leg({ key: 'fee', account: 'fee', amount: '5' }),
    ]
    const pinned = resolveSwapPairFromKeys(legs, { giveKey: 'xrp', receiveKey: 'xlm' })
    expect(pinned).toEqual({ giveIndex: 0, receiveIndex: 1, otherIndexes: [2] })
  })

  it('stores a single swap note on the give leg', () => {
    const legs = [
      leg({ key: '1', account: 'btc', amount: '-0.01', notes: 'old receive' }),
      leg({ key: '2', account: 'usd', amount: '500', notes: 'keep me' }),
      leg({ key: '3', account: 'fee', amount: '5', notes: 'fee note' }),
    ]
    // Force pair indexes: give btc, receive usd
    const pair = detectSwapPairFromLegs(legs, accounts)
    expect(pair).not.toBeNull()
    if (!pair) return

    const next = applySwapPairNote(legs, pair, 'Kraken trade')
    expect(swapPairNote(next, pair)).toBe('Kraken trade')
    expect(next[pair.giveIndex]?.notes).toBe('Kraken trade')
    expect(next[pair.receiveIndex]?.notes).toBe('')
    expect(next[pair.otherIndexes[0]!]?.notes).toBe('fee note')
  })

  it('detects XRP/XLM as the swap pair and leaves fee legs as extras', () => {
    const xrpAccounts = [
      ...accounts,
      {
        id: 'xrp',
        name: 'xrp',
        classification: 'asset' as const,
        subtype: 'holding' as const,
        unit: 'unit-xrp',
        visibility: 'all_members' as const,
        budget: 'budget-1',
        updatedAt: '',
        createdAt: '',
      },
      {
        id: 'xlm',
        name: 'xlm',
        classification: 'asset' as const,
        subtype: 'holding' as const,
        unit: 'unit-xlm',
        visibility: 'all_members' as const,
        budget: 'budget-1',
        updatedAt: '',
        createdAt: '',
      },
    ]
    const legs = [
      leg({ key: '1', account: 'xrp', amount: '-100' }),
      leg({ key: '2', account: 'xlm', amount: '200' }),
      leg({ key: '3', account: 'usd', amount: '-5' }),
      leg({ key: '4', account: 'usd', amount: '5', category: 'fees-cat' }),
    ]
    const pair = detectSwapPairFromLegs(legs, xrpAccounts)
    expect(pair).toEqual({
      giveIndex: 0,
      receiveIndex: 1,
      otherIndexes: [2, 3],
    })
  })

  it('keeps crypto↔crypto (no reporting unit on legs) on the simple form', () => {
    const xrpAccounts = [
      ...accounts,
      {
        id: 'xrp',
        name: 'xrp',
        classification: 'asset' as const,
        subtype: 'holding' as const,
        unit: 'unit-xrp',
        visibility: 'all_members' as const,
        budget: 'budget-1',
        updatedAt: '',
        createdAt: '',
      },
      {
        id: 'xlm',
        name: 'xlm',
        classification: 'asset' as const,
        subtype: 'holding' as const,
        unit: 'unit-xlm',
        visibility: 'all_members' as const,
        budget: 'budget-1',
        updatedAt: '',
        createdAt: '',
      },
    ]
    const entries = [
      { account: 'xrp', amount: -100, fxRate: 0.5, category: null },
      { account: 'xlm', amount: 200, fxRate: 0.25, category: null },
    ]
    expect(entriesPreferSwapView(entries, xrpAccounts, usdReporting)).toBe(false)
  })
})

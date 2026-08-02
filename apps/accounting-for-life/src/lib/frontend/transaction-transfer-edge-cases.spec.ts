import { describe, expect, it } from 'bun:test'

import type { Account, Unit } from '@/types'

import {
  buildSimpleFormPosting,
  resolveEditorLayout,
  shouldExpandTransactionLines,
  transferImpliedRateSummary,
} from './transaction-assistance'
import {
  buildEntriesForSave,
  newTransferSplitDraft,
  normalizeSplitFormFromEntries,
  singleSplitCollapseKind,
  syncSingleTransferSplitAmount,
  transferUnitsDiffer,
  type TransactionSplitFormState,
} from './transaction-splits'
import {
  entriesPreferSwapView,
  isSimpleTransferEntries,
  isWalletTransferEntries,
  newSwapLegDraft,
  swapLegsToEntries,
} from './transaction-swap'

function account(
  id: string,
  unit: string,
  classification: Account['classification'] = 'asset',
  subtype: Account['subtype'] = 'checking',
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
const xrp = 'unit-xrp'
const xlm = 'unit-xlm'
const btc = 'unit-btc'

const accounts: Account[] = [
  account('checking', usd),
  account('savings', usd),
  account('xrp-wallet', xrp, 'asset', 'holding'),
  account('xlm-wallet', xlm, 'asset', 'holding'),
  account('btc-wallet', btc, 'asset', 'holding'),
  account('card', usd, 'liability', 'credit_card'),
  account('fees', usd, 'expense', 'other'),
]

const units: Unit[] = [
  {
    id: usd,
    code: 'USD',
    name: 'USD',
    kind: 'fiat',
    decimalPlaces: 2,
    updatedAt: '',
    createdAt: '',
  },
  {
    id: xrp,
    code: 'XRP',
    name: 'XRP',
    kind: 'crypto',
    decimalPlaces: 6,
    updatedAt: '',
    createdAt: '',
  },
  {
    id: xlm,
    code: 'XLM',
    name: 'XLM',
    kind: 'crypto',
    decimalPlaces: 7,
    updatedAt: '',
    createdAt: '',
  },
  {
    id: btc,
    code: 'BTC',
    name: 'BTC',
    kind: 'crypto',
    decimalPlaces: 8,
    updatedAt: '',
    createdAt: '',
  },
]

describe('transfer edge cases — classification rules', () => {
  it('keeps asymmetric XRP→XLM on the exchange form', () => {
    const entries = [
      { account: 'xrp-wallet', amount: -100, category: null, fxRate: 0.5 },
      { account: 'xlm-wallet', amount: 200, category: null, fxRate: 0.25 },
    ]

    expect(isWalletTransferEntries(entries)).toBe(true)
    expect(isSimpleTransferEntries(entries, accounts, usd)).toBe(true)
    expect(entriesPreferSwapView(entries, accounts, usd)).toBe(false)
    expect(
      resolveEditorLayout({
        entries,
        accounts,
        reportingCurrencyId: usd,
      }),
    ).toBe('exchange')
    expect(
      shouldExpandTransactionLines({
        entries,
        accounts,
        reportingCurrencyId: usd,
      }),
    ).toBe(false)

    const form = normalizeSplitFormFromEntries(entries as never)
    expect(singleSplitCollapseKind(form)).toBe('transfer')
    expect(form.splits[0]?.amount).toBe('200')
    expect(transferUnitsDiffer(form, accounts)).toBe(true)
  })

  it('uses exchange layout for BTC→checking (not journal)', () => {
    const entries = [
      { account: 'btc-wallet', amount: -0.01, category: null, fxRate: 50_000 },
      { account: 'checking', amount: 500, category: null, fxRate: 1 },
    ]

    expect(isWalletTransferEntries(entries)).toBe(true)
    expect(isSimpleTransferEntries(entries, accounts, usd)).toBe(true)
    expect(
      resolveEditorLayout({
        entries,
        accounts,
        reportingCurrencyId: usd,
      }),
    ).toBe('exchange')
    expect(
      shouldExpandTransactionLines({
        entries,
        accounts,
        reportingCurrencyId: usd,
      }),
    ).toBe(false)
  })

  it('expands sell + fee (3 legs)', () => {
    const entries = [
      { account: 'btc-wallet', amount: -0.01, category: null, fxRate: 50_000 },
      { account: 'checking', amount: 495, category: null, fxRate: 1 },
      { account: 'fees', amount: 5, category: null, fxRate: 1 },
    ]

    expect(isWalletTransferEntries(entries)).toBe(false)
    expect(
      shouldExpandTransactionLines({
        entries,
        accounts,
        reportingCurrencyId: usd,
      }),
    ).toBe(true)
  })

  it('keeps asymmetric same-unit legs on the exchange form', () => {
    const entries = [
      { account: 'checking', amount: -100, category: null, fxRate: null },
      { account: 'savings', amount: 95, category: null, fxRate: null },
    ]

    expect(isSimpleTransferEntries(entries, accounts, usd)).toBe(true)
    expect(
      resolveEditorLayout({
        entries,
        accounts,
        reportingCurrencyId: usd,
      }),
    ).toBe('exchange')
    expect(
      shouldExpandTransactionLines({
        entries,
        accounts,
        reportingCurrencyId: usd,
      }),
    ).toBe(false)

    const form = normalizeSplitFormFromEntries(entries as never)
    const synced = syncSingleTransferSplitAmount(form, accounts)
    expect(synced.splits[0]?.amount).toBe('100')
  })

  it('does not treat same-sign or categorized journals as wallet transfers', () => {
    expect(
      isWalletTransferEntries([
        { account: 'checking', amount: -50, category: null, fxRate: null },
        { account: 'savings', amount: -50, category: null, fxRate: null },
      ]),
    ).toBe(false)

    expect(
      isWalletTransferEntries([
        { account: 'checking', amount: -50, category: null, fxRate: null },
        { account: 'checking', amount: 50, category: 'groceries', fxRate: null },
      ]),
    ).toBe(false)
  })
})

describe('transfer edge cases — save / FX rules', () => {
  it('posts asymmetric cross-unit transfer with derived FX and deferred reporting quote', () => {
    const splitState: TransactionSplitFormState = {
      paymentAccount: 'xrp-wallet',
      totalAmount: '-100',
      splits: [newTransferSplitDraft('xlm-wallet', '200')],
    }

    const posting = buildSimpleFormPosting({
      splitState,
      payeeValue: '__transfer__:xlm-wallet',
      isTransfer: true,
      accounts,
      reportingCurrencyId: usd,
    })

    expect(posting.lines).toMatchObject([
      { account: 'xrp-wallet', amount: -100, sortOrder: 0 },
      { account: 'xlm-wallet', amount: 200, sortOrder: 1, fxRate: 0.5 },
    ])
    expect(posting.quoteUnit).toBe(xrp)
    expect(posting.quoteToReportingRate).toBeNull()

    const hint = transferImpliedRateSummary({
      splitState,
      accounts,
      units,
      payeeValue: '__transfer__:xlm-wallet',
      reportingCurrencyId: usd,
    })
    expect(hint?.impliedRate).toContain('XLM per 1 XRP')
    expect(hint?.reportingDeferred).toBe(true)
  })

  it('rejects empty amount received instead of inventing equal magnitude', () => {
    const splitState: TransactionSplitFormState = {
      paymentAccount: 'xrp-wallet',
      totalAmount: '-100',
      splits: [newTransferSplitDraft('xlm-wallet', '')],
    }

    expect(() =>
      buildEntriesForSave({
        splitState,
        payeeValue: '__transfer__:xlm-wallet',
        isTransfer: true,
      }),
    ).toThrow(/amount/i)
  })

  it('credit-card payment shape is a wallet transfer; negative leg becomes payment account', () => {
    const entries = [
      { account: 'card', amount: 100, category: null, fxRate: null },
      { account: 'checking', amount: -100, category: null, fxRate: null },
    ]

    expect(isWalletTransferEntries(entries)).toBe(true)
    expect(isSimpleTransferEntries(entries, accounts, usd)).toBe(true)

    const form = normalizeSplitFormFromEntries(entries as never)
    expect(form.paymentAccount).toBe('checking')
    expect(form.totalAmount).toBe('-100')
  })
})

describe('transfer edge cases — expand escape hatch', () => {
  it('re-expands when a third fee leg is added to a former wallet transfer', () => {
    const legs = [
      newSwapLegDraft('xrp-wallet', '-100'),
      newSwapLegDraft('xlm-wallet', '200'),
      newSwapLegDraft('fees', '1'),
    ]

    expect(() => swapLegsToEntries(legs, accounts, usd)).toThrow(/balance/i)
    expect(
      shouldExpandTransactionLines({
        entries: legs.map((leg) => ({
          account: leg.account,
          amount: Number(leg.amount),
          category: null,
          fxRate: null,
        })),
        accounts,
        reportingCurrencyId: usd,
      }),
    ).toBe(true)
  })
})

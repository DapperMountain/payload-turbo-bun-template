import { describe, expect, it } from 'bun:test'

import {
  validateEntryCompleteness,
  validateTransactionCounterparty,
  validateTransactionLinesBalance,
  validateTransferEntries,
} from './validateTransactionLines'

describe('validateTransactionLinesBalance', () => {
  it('accepts balanced lines (legacy native-only call)', () => {
    expect(() =>
      validateTransactionLinesBalance([
        { amount: 100 },
        { amount: -100 },
      ]),
    ).not.toThrow()
  })

  it('rejects unbalanced lines (legacy native-only call)', () => {
    expect(() =>
      validateTransactionLinesBalance([
        { amount: 100 },
        { amount: -50 },
      ]),
    ).toThrow(/sum to zero/)
  })

  it('requires at least two lines', () => {
    expect(() => validateTransactionLinesBalance([{ amount: 0 }])).toThrow(/at least two/)
  })

  it('uses native balance when every leg shares one unit', () => {
    expect(() =>
      validateTransactionLinesBalance(
        [
          { account: 'a', amount: -25 },
          { account: 'b', amount: 25 },
        ],
        {
          reportingUnitId: 'usd',
          unitByAccountId: { a: 'usd', b: 'usd' },
        },
      ),
    ).not.toThrow()

    expect(() =>
      validateTransactionLinesBalance(
        [
          { account: 'a', amount: -25 },
          { account: 'b', amount: 20 },
        ],
        {
          reportingUnitId: 'usd',
          unitByAccountId: { a: 'usd', b: 'usd' },
        },
      ),
    ).toThrow(/sum to zero/)
  })

  it('balances mixed-unit journals in quote space (quote = reporting)', () => {
    expect(() =>
      validateTransactionLinesBalance(
        [
          { account: 'eur', amount: -10, fxRate: 1.1 },
          { account: 'usd', amount: 11 },
        ],
        {
          reportingUnitId: 'usd',
          unitByAccountId: { eur: 'eur', usd: 'usd' },
        },
      ),
    ).not.toThrow()
  })

  it('rejects mixed-unit journals that do not balance in quote currency', () => {
    expect(() =>
      validateTransactionLinesBalance(
        [
          { account: 'eur', amount: -10, fxRate: 1.1 },
          { account: 'usd', amount: 10 },
        ],
        {
          reportingUnitId: 'usd',
          unitByAccountId: { eur: 'eur', usd: 'usd' },
        },
      ),
    ).toThrow(/quote amounts must sum to zero/)
  })

  it('requires fxRate on cross-quote legs in mixed-unit journals', () => {
    expect(() =>
      validateTransactionLinesBalance(
        [
          { account: 'eur', amount: -10 },
          { account: 'usd', amount: 11 },
        ],
        {
          reportingUnitId: 'usd',
          unitByAccountId: { eur: 'eur', usd: 'usd' },
        },
      ),
    ).toThrow(/fxRate is required/)
  })

  it('accepts a three-leg swap with fee balancing in quote (= reporting) currency', () => {
    // Sell 0.01 BTC @ $50_000 / BTC → +500 USD; pay $5 fee expense.
    expect(() =>
      validateTransactionLinesBalance(
        [
          { account: 'btc', amount: -0.01, fxRate: 50_000 },
          { account: 'usd', amount: 495 },
          { account: 'fees', amount: 5 },
        ],
        {
          reportingUnitId: 'usd',
          unitByAccountId: { btc: 'btc', usd: 'usd', fees: 'usd' },
        },
      ),
    ).not.toThrow()
  })

  it('balances mixed-unit journals when quote differs from reporting', () => {
    // Quote EUR: −10 EUR + 12 USD × (10/12) = 0; reporting via 1.1 USD/EUR.
    expect(() =>
      validateTransactionLinesBalance(
        [
          { account: 'eur', amount: -10 },
          { account: 'usd', amount: 12, fxRate: 10 / 12 },
        ],
        {
          reportingUnitId: 'usd',
          quoteUnitId: 'eur',
          quoteToReportingRate: 1.1,
          unitByAccountId: { eur: 'eur', usd: 'usd' },
        },
      ),
    ).not.toThrow()
  })

  it('allows deferred reporting when quote ≠ reporting and quote→reporting is omitted', () => {
    expect(() =>
      validateTransactionLinesBalance(
        [
          { account: 'eur', amount: -10 },
          { account: 'usd', amount: 12, fxRate: 10 / 12 },
        ],
        {
          reportingUnitId: 'usd',
          quoteUnitId: 'eur',
          unitByAccountId: { eur: 'eur', usd: 'usd' },
        },
      ),
    ).not.toThrow()
  })
})

describe('validateTransferEntries', () => {
  it('rejects categories on transfer lines', () => {
    expect(() =>
      validateTransferEntries('transfer', [
        { amount: 100, category: 'cat-1' },
        { amount: -100 },
      ]),
    ).toThrow(/cannot include category/)
  })

  it('allows categories on non-transfer entries', () => {
    expect(() =>
      validateTransferEntries('transaction', [
        { amount: 100, category: 'cat-1' },
        { amount: -100 },
      ]),
    ).not.toThrow()
  })
})

describe('validateEntryCompleteness', () => {
  it('rejects legs with no account', () => {
    expect(() =>
      validateEntryCompleteness([
        { account: 'checking', amount: -5, category: 'fees' },
        { account: '', amount: 5 },
      ]),
    ).toThrow(/requires an account/)
  })

  it('rejects orphan spend with no category, payee, or balancing counter', () => {
    expect(() =>
      validateEntryCompleteness([{ account: 'checking', amount: -5 }]),
    ).toThrow(/category or payee/)
  })

  it('rejects legacy same-account payment twins (use cash + P&L instead)', () => {
    expect(() =>
      validateEntryCompleteness([
        { account: 'checking', amount: -5 },
        { account: 'checking', amount: 5, category: 'fees', payee: 'Kraken' },
      ]),
    ).toThrow(/category or payee/)
  })

  it('allows classical cash + categorized P&L counter-legs', () => {
    expect(() =>
      validateEntryCompleteness([
        { account: 'checking', amount: -5 },
        { account: 'budget-expenses', amount: 5, category: 'fees', payee: 'Kraken' },
      ]),
    ).not.toThrow()
  })

  it('allows uncategorized transfer-like counter-legs', () => {
    expect(() =>
      validateEntryCompleteness([
        { account: 'xrp', amount: -100 },
        { account: 'xlm', amount: 200 },
      ]),
    ).not.toThrow()
  })
})

describe('validateTransactionCounterparty', () => {
  it('rejects categorized legs without a merchant payee even when header is set', () => {
    expect(() =>
      validateTransactionCounterparty('transaction', 'Costco', [
        { account: 'checking', amount: -40 },
        { account: 'budget-expenses', amount: 40, category: 'groceries' },
      ] as never),
    ).toThrow(/Each categorized line needs a payee/)
  })

  it('allows categorized legs with entry merchant', () => {
    expect(() =>
      validateTransactionCounterparty('transaction', null, [
        { amount: -40 },
        { amount: 40, category: 'groceries', payee: 'Costco' },
      ]),
    ).not.toThrow()
  })

  it('allows uncategorized multi-account books without entry merchants', () => {
    expect(() =>
      validateTransactionCounterparty('transaction', 'Coinbase', [
        { amount: -0.01 },
        { amount: 500 },
      ]),
    ).not.toThrow()
  })

  it('skips transfers', () => {
    expect(() =>
      validateTransactionCounterparty('transfer', null, [
        { amount: -100 },
        { amount: 100 },
      ]),
    ).not.toThrow()
  })
})

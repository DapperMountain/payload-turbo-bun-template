import { describe, expect, it } from 'bun:test'

import { validateTransactionLinesBalance, validateTransferEntries } from './validateTransactionLines'

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

  it('balances mixed-unit journals on reporting amounts', () => {
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

  it('rejects mixed-unit journals that do not balance in reporting currency', () => {
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
    ).toThrow(/reporting amounts must sum to zero/)
  })

  it('requires fxRate on cross-currency legs in mixed-unit journals', () => {
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

  it('accepts a three-leg swap with fee balancing in reporting currency', () => {
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

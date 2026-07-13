import { describe, expect, it } from 'bun:test'

import { validateTransactionLinesBalance, validateTransferEntries } from './validateTransactionLines'

describe('validateTransactionLinesBalance', () => {
  it('accepts balanced lines', () => {
    expect(() =>
      validateTransactionLinesBalance([
        { amount: 100 },
        { amount: -100 },
      ]),
    ).not.toThrow()
  })

  it('rejects unbalanced lines', () => {
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

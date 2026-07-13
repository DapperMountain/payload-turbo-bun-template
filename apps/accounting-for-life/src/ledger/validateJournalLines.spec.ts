import { describe, expect, it } from 'bun:test'

import { validateJournalLinesBalance, validateTransferLines } from '@/ledger'

describe('validateJournalLinesBalance', () => {
  it('accepts balanced lines', () => {
    expect(() =>
      validateJournalLinesBalance([
        { amount: 100 },
        { amount: -100 },
      ]),
    ).not.toThrow()
  })

  it('rejects unbalanced lines', () => {
    expect(() =>
      validateJournalLinesBalance([
        { amount: 100 },
        { amount: -50 },
      ]),
    ).toThrow(/sum to zero/)
  })

  it('requires at least two lines', () => {
    expect(() => validateJournalLinesBalance([{ amount: 0 }])).toThrow(/at least two/)
  })
})

describe('validateTransferLines', () => {
  it('rejects categories on transfer lines', () => {
    expect(() =>
      validateTransferLines('transfer', [
        { amount: 100, category: 'cat-1' },
        { amount: -100 },
      ]),
    ).toThrow(/cannot include category/)
  })

  it('allows categories on non-transfer entries', () => {
    expect(() =>
      validateTransferLines('transaction', [
        { amount: 100, category: 'cat-1' },
        { amount: -100 },
      ]),
    ).not.toThrow()
  })
})

import { describe, expect, it } from 'bun:test'

import {
  buildMatchMergePatch,
  isImportLike,
  resolveMatchPair,
} from './matchTransactions'

const base = {
  workspace: 'ws-1',
  budget: 'budget-1',
  date: '2026-07-01T12:00:00.000Z',
  type: 'transaction' as const,
  status: 'pending' as const,
  source: 'manual' as const,
  externalId: null as string | null,
  importBatch: null as string | null,
  entries: undefined as undefined,
}

describe('matchTransactions', () => {
  it('detects import rows by source', () => {
    expect(isImportLike({ source: 'import' })).toBe(true)
    expect(isImportLike({ source: 'manual' })).toBe(false)
  })

  it('keeps the manual row and absorbs the import row', () => {
    const manual = { ...base, id: 'manual-1' }
    const imported = {
      ...base,
      id: 'import-1',
      source: 'import' as const,
      externalId: 'plaid:txn-1',
      importBatch: 'batch-a',
      date: '2026-07-02T12:00:00.000Z',
      status: 'posted' as const,
      entries: [{ account: 'acct', amount: -5, payee: 'STARBUCKS' }],
    }

    const { keep, absorb } = resolveMatchPair(imported, manual)
    expect(keep.id).toBe('manual-1')
    expect(absorb.id).toBe('import-1')

    const patch = buildMatchMergePatch(keep, absorb)
    expect(patch.source).toBe('import')
    expect(patch.externalId).toBe('plaid:txn-1')
    expect(patch.importBatch).toBe('batch-a')
    expect(patch.date).toBe(imported.date)
    expect(patch.status).toBe('posted')
    expect(patch.entries).toEqual([
      {
        account: 'acct',
        amount: -5,
        category: undefined,
        payee: 'STARBUCKS',
        notes: undefined,
        sortOrder: 0,
        fxRate: undefined,
      },
    ])
  })

  it('rejects two manuals or two imports', () => {
    expect(() =>
      resolveMatchPair(
        { ...base, id: 'a', source: 'manual' },
        { ...base, id: 'b', source: 'manual' },
      ),
    ).toThrow(/manual and one imported/)

    expect(() =>
      resolveMatchPair(
        { ...base, id: 'a', source: 'import' },
        { ...base, id: 'b', source: 'import' },
      ),
    ).toThrow(/manual and one imported/)
  })

  it('rejects conflicting externalIds on an otherwise valid pair', () => {
    expect(() =>
      resolveMatchPair(
        { ...base, id: 'a', source: 'manual', externalId: 'one' },
        { ...base, id: 'b', source: 'import', externalId: 'two' },
      ),
    ).toThrow(/conflicting externalIds/)
  })
})

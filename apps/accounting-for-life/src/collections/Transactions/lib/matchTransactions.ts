import type { Transaction } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

import {
  attachSingleNoteToEntries,
  bubbledEntryNotes,
  type TransactionEntryInput,
} from './entries'

export type MatchCandidate = Pick<
  Transaction,
  | 'id'
  | 'workspace'
  | 'budget'
  | 'date'
  | 'type'
  | 'status'
  | 'source'
  | 'externalId'
  | 'importBatch'
  | 'entries'
>

export type ResolvedMatchPair = {
  keep: MatchCandidate
  absorb: MatchCandidate
}

/** Import row for matching — keyed on `source: import` (not merely having an externalId). */
export function isImportLike(transaction: Pick<Transaction, 'source'>): boolean {
  return transaction.source === 'import'
}

/**
 * YNAB-style survivor: keep the manual row, absorb the import row.
 * Requires one import-like and one non-import row in the same workspace/budget.
 */
export function resolveMatchPair(
  first: MatchCandidate,
  second: MatchCandidate,
): ResolvedMatchPair {
  if (first.id === second.id) {
    throw new Error('Select two different transactions to match')
  }

  const workspaceA = getCollectionId(first.workspace)
  const workspaceB = getCollectionId(second.workspace)
  const budgetA = getCollectionId(first.budget)
  const budgetB = getCollectionId(second.budget)

  if (!workspaceA || workspaceA !== workspaceB) {
    throw new Error('Matched transactions must belong to the same workspace')
  }

  if (!budgetA || budgetA !== budgetB) {
    throw new Error('Matched transactions must belong to the same budget')
  }

  const firstImport = isImportLike(first)
  const secondImport = isImportLike(second)

  if (firstImport === secondImport) {
    throw new Error('Match requires one manual and one imported transaction')
  }

  const keep = firstImport ? second : first
  const absorb = firstImport ? first : second

  const keepExternal = keep.externalId?.trim() || null
  const absorbExternal = absorb.externalId?.trim() || null

  if (keepExternal && absorbExternal && keepExternal !== absorbExternal) {
    throw new Error('Both transactions have conflicting externalIds')
  }

  return { keep, absorb }
}

export type MatchMergePatch = {
  date?: string
  source: 'manual' | 'import'
  status?: 'pending' | 'posted'
  externalId?: string | null
  importBatch?: string | null
  /** When set, replace legs and post (pending keep + posted absorb). */
  entries?: TransactionEntryInput[]
}

function entryInputsFromCandidate(transaction: MatchCandidate): TransactionEntryInput[] {
  if (!Array.isArray(transaction.entries)) return []

  return transaction.entries.map((line, index) => ({
    account: getCollectionId(line.account) ?? '',
    amount: line.amount,
    category: getCollectionId(line.category),
    payee: line.payee ?? undefined,
    notes: line.notes ?? undefined,
    sortOrder: line.sortOrder ?? index,
    fxRate: line.fxRate,
  }))
}

/**
 * Build the survivor update: keep the manual legs (payees live on them); take import
 * identity + bank date; adopt absorb legs only when keep is still pending.
 */
export function buildMatchMergePatch(
  keep: MatchCandidate,
  absorb: MatchCandidate,
): MatchMergePatch {
  const keepNotes = bubbledEntryNotes(entryInputsFromCandidate(keep))
  const absorbNotes = bubbledEntryNotes(entryInputsFromCandidate(absorb))
  const preferredNotes = keepNotes ?? absorbNotes

  const patch: MatchMergePatch = {
    source: 'import',
    externalId: keep.externalId?.trim() || absorb.externalId?.trim() || null,
    importBatch: keep.importBatch?.trim() || absorb.importBatch?.trim() || null,
    date: absorb.date,
  }

  if (keep.status !== 'posted' && absorb.status === 'posted') {
    const lines = entryInputsFromCandidate(absorb)
    if (lines.length) {
      patch.entries = preferredNotes
        ? attachSingleNoteToEntries(lines, preferredNotes)
        : lines
      patch.status = 'posted'
    }
  }

  return patch
}

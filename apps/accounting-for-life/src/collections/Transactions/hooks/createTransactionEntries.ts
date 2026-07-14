import type { CollectionAfterChangeHook } from 'payload'

import type { TransactionEntryInput } from '@/collections/Transactions/lib/entries'
import type { Transaction } from '@/types'

import { deleteTransactionEntries, writeTransactionEntries } from './writeTransactionEntries'

/**
 * Persists `transaction-entries` from `context.entries` after create,
 * or replaces legs after update when `context.replaceEntries` is set.
 */
export const syncTransactionEntries: CollectionAfterChangeHook<Transaction> = async ({
  doc,
  operation,
  context,
  req,
}) => {
  if (operation === 'create') {
    const lines = (context.entries ?? req.context?.entries) as TransactionEntryInput[] | undefined

    if (!lines?.length) {
      return doc
    }

    await writeTransactionEntries(req, doc, lines)
    return doc
  }

  if (operation === 'update') {
    if (context.skipEntrySync) {
      return doc
    }

    const lines = (context.replaceEntries ?? req.context?.replaceEntries) as
      | TransactionEntryInput[]
      | undefined

    if (!lines?.length) {
      return doc
    }

    await deleteTransactionEntries(req, doc.id)
    await writeTransactionEntries(req, doc, lines)
  }

  return doc
}

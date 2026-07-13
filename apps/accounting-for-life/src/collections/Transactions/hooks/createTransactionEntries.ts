import type { CollectionAfterChangeHook } from 'payload'

import type { Transaction } from '@/types'

import type { PostingLineInput } from './prepareTransactionPosting'
import { deleteTransactionEntries, writeTransactionEntries } from './writeTransactionEntries'

/**
 * Persists `transaction-entries` from `context.postingLines` after create,
 * or replaces legs after update when `context.replacePostingLines` is set.
 */
export const syncTransactionEntries: CollectionAfterChangeHook<Transaction> = async ({
  doc,
  operation,
  context,
  req,
}) => {
  if (operation === 'create') {
    const postingLines = (context.postingLines ?? req.context?.postingLines) as
      | PostingLineInput[]
      | undefined

    if (!postingLines?.length) {
      return doc
    }

    await writeTransactionEntries(req, doc, postingLines)
    return doc
  }

  if (operation === 'update') {
    if (context.skipEntrySync) {
      return doc
    }

    const postingLines = (context.replacePostingLines ?? req.context?.replacePostingLines) as
      | PostingLineInput[]
      | undefined

    if (!postingLines?.length) {
      return doc
    }

    await deleteTransactionEntries(req, doc.id)
    await writeTransactionEntries(req, doc, postingLines)
  }

  return doc
}

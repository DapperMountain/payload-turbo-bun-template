import type { CollectionAfterReadHook } from 'payload'

import {
  entryViewsFromStoredDocs,
  storedDocsFromJoin,
} from '@/collections/Transactions/lib/entries'
import type { Transaction } from '@/types'

/**
 * Expose persisted legs on `entries` (same field name as write) and hide internal join metadata.
 */
export const shapeTransactionEntriesOnRead: CollectionAfterReadHook<Transaction> = async ({
  doc,
  req,
}) => {
  let stored = storedDocsFromJoin(doc.entryJoin)

  if (!stored.length && doc.status === 'posted') {
    const result = await req.payload.find({
      collection: 'transaction-entries',
      where: { transaction: { equals: doc.id } },
      sort: 'sortOrder',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      req,
    })
    stored = result.docs
  }

  doc.entries = entryViewsFromStoredDocs(stored)

  if ('entryJoin' in doc) {
    delete doc.entryJoin
  }

  return doc
}

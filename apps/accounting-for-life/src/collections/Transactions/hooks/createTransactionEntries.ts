import type { CollectionAfterChangeHook } from 'payload'

import type { TransactionEntryInput } from '@/collections/Transactions/lib/entries'
import type { Transaction } from '@/types'

import {
  adjustCreditCardPaymentFunding,
  fundingLinesFromEntries,
} from './fundCreditCardPaymentEnvelopes'
import { deleteTransactionEntries, writeTransactionEntries } from './writeTransactionEntries'

/**
 * Persists `transaction-entries` from `context.entries` after create,
 * or replaces legs after update when `context.replaceEntries` is set.
 *
 * Also funds (or reverses) credit-card payment envelopes for categorized card spend (US-4.4).
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
    await adjustCreditCardPaymentFunding(req, doc, lines, 1)
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

    const previous = await req.payload.find({
      collection: 'transaction-entries',
      where: { transaction: { equals: doc.id } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
      req,
    })

    await adjustCreditCardPaymentFunding(
      req,
      doc,
      fundingLinesFromEntries(previous.docs),
      -1,
    )
    await deleteTransactionEntries(req, doc.id)
    await writeTransactionEntries(req, doc, lines)
    await adjustCreditCardPaymentFunding(req, doc, lines, 1)
  }

  return doc
}

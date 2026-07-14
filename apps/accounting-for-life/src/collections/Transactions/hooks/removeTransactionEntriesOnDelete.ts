import type { CollectionBeforeDeleteHook } from 'payload'

import type { Transaction } from '@/types'

import {
  adjustCreditCardPaymentFunding,
  fundingLinesFromEntries,
} from './fundCreditCardPaymentEnvelopes'
import { deleteTransactionEntries } from './writeTransactionEntries'

export const removeTransactionEntriesOnDelete: CollectionBeforeDeleteHook<Transaction> = async ({
  id,
  req,
}) => {
  const transactionId = String(id)

  const [transaction, previous] = await Promise.all([
    req.payload.findByID({
      collection: 'transactions',
      id: transactionId,
      depth: 0,
      overrideAccess: true,
      req,
    }),
    req.payload.find({
      collection: 'transaction-entries',
      where: { transaction: { equals: transactionId } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
      req,
    }),
  ])

  await adjustCreditCardPaymentFunding(
    req,
    transaction,
    fundingLinesFromEntries(previous.docs),
    -1,
  )
  await deleteTransactionEntries(req, transactionId)
}
